const createError = require("http-errors");

const { SERVER_URL } = process.env;

const { User, PhoneCode, EmailCode } = require("../models");
const usersController = require("./users.controller");
const { sendEmail } = require("../utils/aws.util");
const { createRandomCode, sendSMS } = require("../utils/generic.util");
const { USER_STATUS, SEND_PHONE_CODE_SOURCE } = require("../constants");
const { getCustomer } = require("./tekmetric.controller");
const { last } = require("lodash");
const customerioController = require("./customeio.controller");

const login = async (phoneNumber, password) => {
  let user = await User.findOne({
    phoneNumber,
  }).populate("shopId");
  if (!user) {
    throw createError(403, "Phone number not registerd");
  }

  if (user.isLoginLocked) {
    throw createError(
      403,
      "Too many invalid login attempts, your login has been locked temporarily, please select forgot your password or contact us"
    );
  }

  if (user.password !== password) {
    if (user.invalidLoginAttempts > 50) {
      user.invalidLoginAttempts = user.invalidLoginAttempts + 1;
      user.isLoginLocked = true;
      user.save();

      throw createError(
        403,
        "Too many invalid login attempts, your login with email has been locked temporarily, please login with your phone to continue"
      );
    }

    user.invalidLoginAttempts = user.invalidLoginAttempts + 1;
    user.save();

    throw createError(406, "Invalid credentials");
  }

  if (user.userStatus === USER_STATUS.SUSPENDED) {
    if (!isActivationAllowed) {
      throw createError(403, "Your account is suspended");
    }
    usersController.updateUser(user._id, { userStatus: USER_STATUS.ACTIVE });
  }

  user.invalidLoginAttempts = 0;
  user.save();

  return user;
};

const getUserByPhoneNumber = async (phoneNumber) =>
  User.findOne({ phoneNumber }).populate("shopId");

const register = async (phoneNumber, shopId, password, deviceType) => {
  let existingUser = await User.findOne({ phoneNumber });

  if (existingUser) {
    throw createError(400, "User already exists");
  }

  let userData = {
    phoneNumber,
    password,
    shopId,
    referralCode: createRandomCode(8, "hex"),
  };

  // try {
  const userWithTekmetricData = await getCustomer(shopId, phoneNumber);
  if (userWithTekmetricData) {
    userData = { ...userData, ...userWithTekmetricData };
  }
  // } catch (error) {
  //   console.log("Error from Tekmetric while fetching customer details", error.message);
  //   throw new Error("Tekmetric syncing error, please contact admin")
  // }

  let user = await User.create(userData);

  if (user.tekmetricId) {
    try {
      await customerioController.createOrUpdateUser(user.tekmetricId, {
        phoneNumber,
        device_type: deviceType || "IOS",
        existing_client: true,
        isAppUser: true,
      });
      await customerioController.track(user.tekmetricId, "new_app_account", {
        phoneNumber,
        device_type: deviceType || "IOS",
        existing_client: true,
        isAppUser: true,
      });
    } catch (error) {
      console.log("Error in customer.io", error);
    }
  }

  await user.populate("shopId");
  return user;
  // existingUser.invalidLoginAttempts = 0;
  // existingUser.isLoginLocked = false;
  // existingUser.save();

  // return existingUser;
};

const sendCodeOnPhone = async (phoneNumber, shopId, password) => {
  phoneNumber = phoneNumber.replaceAll(" ", "");

  let existingCodeCount = await PhoneCode.count({ phoneNumber });

  if (existingCodeCount >= 3) {
    throw createError(
      403,
      "Too many codes sent to this phone number, please try again for a few minutes"
    );
  }

  const code = createRandomCode();

  try {
    await sendSMS(
      phoneNumber,
      `Your Integrity 1st Automotive App verification code is: ${code}`
    );
  } catch (error) {
    throw createError(400, "SMS could not be send");
  }
  return PhoneCode.create({ phoneNumber, code, shopId, password });
};

const verifyPhoneCode = async (phoneNumber, code) => {
  let targetPhoneCode = await PhoneCode.findOne({ phoneNumber, code });
  if (!targetPhoneCode) {
    throw createError(403, "Code is invalid or expired");
  }

  await targetPhoneCode.remove();

  return targetPhoneCode;
};

const sendEmailVerificationLink = async (email) => {
  const code = createRandomCode();
  await sendEmail(
    email,
    "Wander Travel Email Verification",
    `Welcome to Wander,

We are a social networking app for the passionate traveler. We hope through our platform, you will explore, find your adventures and make those meaningful connections with people from all over the world.

But first, let's help out the travel community and please verify your email address by using the following link:
${SERVER_URL}/auth/verify-email?email=${email}&code=${code}

#DontGoAlone

Regards,
Wander Team`
  );
  return EmailCode.create({ email, code });
};

const verifyEmailCode = async (email, code) => {
  let targetEmailCode = await EmailCode.findOne({ email, code });

  if (!targetEmailCode) {
    const user = await User.findOne({ email });
    if (user && user.isEmailVerified) {
      throw createError(403, "Your email has already been verified");
    }
    throw createError(403, "Code is invalid or expired");
  }

  return Promise.all([
    User.findOneAndUpdate({ email }, { isEmailVerified: true }),
    EmailCode.deleteMany({ email }),
  ]);
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return;
  }

  const code = createRandomCode();

  await sendEmail(
    email,
    "Wander - Password Recovery",
    `Hi,\n\nWe have noticed that you requested a password recovery, please click the link below to proceed further with the password recovery.\n\n${SERVER_URL}/auth/recover-password?email=${email}&code=${code}

    Thanks,
    Wander Rescue Team.`
  );

  return EmailCode.create({ email, code });
};

const resetPassword = async (email, code, password) => {
  const emailCode = await EmailCode.findOne({ email, code });

  if (!emailCode) {
    throw createError(404, "This link is either expired or invalid!");
  }

  return Promise.all([
    emailCode.remove(),
    User.findOneAndUpdate({ email }, { password }),
  ]);
};

const changePassword = async (currentUser, oldPassword, newPassword) => {
  if (currentUser.password !== oldPassword) {
    throw createError(401, "Old password is invalid");
  }

  if (currentUser.password === newPassword) {
    throw createError(400, "Old and new password can't be same");
  }

  return User.findByIdAndUpdate(currentUser._id, { password: newPassword });
};

const deleteAccount = async (currentUser) => {
  if (currentUser.userStatus === USER_STATUS.DELETED) {
    throw createError(400, "Your account has already been deleted");
  }

  return User.findByIdAndUpdate(currentUser._id, {
    userStatus: USER_STATUS.DELETED,
  });
};

module.exports = {
  login,
  register,

  verifyPhoneCode,
  sendCodeOnPhone,

  verifyEmailCode,
  sendEmailVerificationLink,
  getUserByPhoneNumber,

  forgotPassword,
  resetPassword,
  changePassword,

  deleteAccount,
};
