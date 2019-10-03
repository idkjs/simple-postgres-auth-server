const aws = require("aws-sdk");
// use AWS global variables
aws.config.accessKeyId;
aws.config.secretAccessKey;
aws.config.region;
console.log("Region: ", aws.config.region);
console.log("accessKeyId: ", aws.config.credentials.accessKeyId);
console.log("secretAccessKey: ", aws.config.credentials.secretAccessKey);
// Create an Email function
function registrationEmail(to, sub, content) {
  let ses = new aws.SES();

  let from = "lecoderie@gmail.com"; // The email address added here must be verified in Amazon SES
  //Amazon SES email format
  ses.sendEmail(
    {
      Source: from,
      Destination: { ToAddresses: to },
      Message: {
        Subject: {
          Data: sub
        },
        Body: {
          Html: {
            Data: content
          }
        }
      }
    },
    function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("Email sent:");
        console.log(data);
      }
    }
  );
}
// Export the Email function
module.exports = {
  registrationEmail
};