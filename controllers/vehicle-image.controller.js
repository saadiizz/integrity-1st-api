const cloudinary = require("cloudinary");

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  IMAGIN_STUDIO_CUSTOMER_ID,
} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const getVehicleImage = async (
  make = "audi",
  model = "a8",
  modelYear = 2021
) => {
  try {
    let { url } = await cloudinary.v2.uploader.upload(
      `https://cdn.imagin.studio/getImage?customer=${IMAGIN_STUDIO_CUSTOMER_ID}&make=${make}&modelFamily=${model}&modelYear=${modelYear}`,
      {
        responsive_breakpoints: {
          create_derived: true,
          bytes_step: 20000,
          min_width: 200,
          max_width: 1000,
        },
      }
    );
    url = url.replace("http://", "https://");
    return url;
  } catch (error) {
    console.log("Error while fetching vehicle image", error.message);
    return "";
  }
};

module.exports = {
  getVehicleImage,
};
