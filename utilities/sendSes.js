const aws = require('aws-sdk');
const ses = require('node-ses');
aws.config.getCredentials(function(err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log("Access key:", aws.config.credentials.accessKeyId);
    console.log("Secret access key:", aws.config.credentials.secretAccessKey);
    console.log("Region:", aws.config.credentials.region);
  }
});
console.log("Region: ", aws.config);
console.log("Region: ", aws.config.region);
console.log("accessKeyId: ", aws.config.credentials.accessKeyId);
console.log("secretAccessKey: ", aws.config.credentials.secretAccessKey);
// // use AWS global variables
aws.config.accessKeyId;
aws.config.secretAccessKey;
aws.config.region;
var mode   = process.env.NODE_ENV;

console.log(aws.config.accessKeyId);
console.log(process.env.AWS_ACCESS_KEY_ID);
console.log("mode: " + mode);
// console.log(process.env);
// Create an Email function
let config = { key:process.env.AWS_ACCESS_KEY_ID, secret:process.env.AWS_ACCESS_KEY_ID, amazon: 'https://email.eu-west-1.amazonaws.com' };
let config2 = { key:"AKIAJMSMQOT23VEI3WSQ", secret:"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", amazon: 'https://email.eu-west-1.amazonaws.com' };
console.log(config2);
function Email(to, sub, content) {
	// let client = ses.createClient({ key: 1, secret: 2, amazon: 'https://email.eu-west-1.amazonaws.com' });
	let client = ses.createClient({ key:"AKIAJMSMQOT23VEI3WSQ", secret:"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", amazon: 'https://email.eu-west-1.amazonaws.com' });
	let from = 'lecoderie@gmail.com';
	// Give SES the details and let it construct the message for you.
	client.sendEmail(
		{
			to: to,
			from: from,
			subject: sub,
			message: content,
			altText: 'plain text'
		},
		function(err, data) {
			if (err) {
				console.log(err);
			}
			else {
				console.log('Email sent:');
				console.log(data);
			}
		}
	);
}
// Export the Email function
module.exports = {
	Email
};
