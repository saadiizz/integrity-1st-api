const AWS = require("aws-sdk");
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;

AWS.config.update({
  region: "us-east-1",
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const sendEmail = (toEmail, subject, content) =>
  new AWS.SES({ apiVersion: "2010-12-01" })
    .sendEmail({
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Body: {
          // Html: {
          //   Charset: "UTF-8",
          //   Data: "HTML_FORMAT_BODY",
          // },
          Text: {
            Charset: "UTF-8",
            Data: content,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
      Source: "no-reply@wandertravelapp.com",
    })
    .promise();

const sendSMS = (phoneNumber, text) => {
  return new AWS.SNS({ apiVersion: "2010-03-31" })
    .publish({
      Message: text,
      PhoneNumber: phoneNumber,
    })
    .promise();
};

module.exports = {
  sendEmail,
  sendSMS,
};
