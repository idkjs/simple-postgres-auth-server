const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// const sendEmail = require("../../utilities/sendSes");
const sendEmail = require('../../utilities/sendEmail');
const database = require('../../database');
// Validation
const checkRegistrationFields = require('../../validation/register');
// Resend email validaiton
const checkResendField = require("../../validation/resend");


// Register route
router.post('/register', (req, res) => {
	// Ensures that all entries by the user are valid
	const { errors, isValid } = checkRegistrationFields(req.body);

	// If any of the entries made by the user are invalid, a status 400 is returned with the error
	if (!isValid) {
		return res.status(400).json(errors);
	}

	let token;
	crypto.randomBytes(48, (err, buf) => {
		if (err) throw err;
		token = buf
			.toString('base64')
			.replace(/\//g, '') // Because '/' and '+' aren't valid in URLs
			.replace(/\+/g, '-');
		return token;
	});
	/* Next we'll add our database function which inserts the users email, password, registration date, token, the date the token was created, whether the user is verified or not and if the token has been used before. With a salt factor of 12 we hash the users password with bcrypt so that we don't just store it as plain text in the database. */
	bcrypt.genSalt(12, (err, salt) => {
		if (err) throw err;
		bcrypt.hash(req.body.password1, salt, (err, hash) => {
			if (err) throw err;
			database('users')
				.returning([
					'id',
					'email',
					'registered',
					'token'
				])
				.insert({
					email: req.body.email,
					password: hash,
					registered: Date.now(),
					token: token,
					createdtime: Date.now(),
					emailverified: 'f',
					tokenusedbefore: 'f'
				})
				.then((user) => {
					let to = [
						user[0].email
					]; // Email address must be an array

					// When you set up your front-end you can create a working verification link here
					let link = 'https://yourWebsite/v1/users/verify/' + user[0].token;

					// Subject of your email
					let sub = 'Confirm Registration';

					// In this email we are sending HTML
					let content = '<body><p>Please verify your email.</p> <a href=' + link + '>Verify email</a></body>';
					// Use the Email function of our send email utility
					sendEmail.registrationEmail(to, sub, content);

					res.json('Success!');
				})
				.catch((err) => {
					console.log(err);
					errors.account = 'Email already registered';
					res.status(400).json(errors);
				});
		});
	});
});
/* add another route that will take in the token that is sent when a user registers through your API. Under your '/register' route and a new post route for '/verify/:token' that will grab the token from the request parameters: */
router.post('/verify/:token', (req, res) => {
	const { token } = req.params;
	const errors = {};
	/* Add a database query that checks if the token exists and has not been used before. In which case, return an "Email verifed!" message and update the 'emailverifed' and 'tokenusedbefore' fields to true: */
	database
		.returning([
			'email',
			'emailverified',
			'tokenusedbefore'
		])
		.from('users')
		.where({ token: token, tokenusedbefore: 'f' })
		.update({ emailverified: 't', tokenusedbefore: 't' })
		.then((data) => {
			if (data.length > 0) {
				// Return an email verified message
				res.json('Email verified! Please login to access your account');
			}
			else {
				/* If the above query comes back empty, check the database again to see if the token exists and if 'emailverified' is true. In which case send a message stating 'Email already verified': */
				database
					.select('email', 'emailverified', 'tokenusedbefore')
					.from('users')
					.where('token', token)
					.then((check) => {
						if (check.length > 0) {
							if (check[0].emailverified) {
								errors.alreadyVerified = 'Email already verified. Please login to your account.';
								res.status(400).json(errors);
							}
            }
            /* If token is absent there could be two possibilities, the user did not register or the token has expired: */
						else {
							errors.email_invalid =
								'Email invalid. Please check if you have registered with the correct email address or re-send the verification link to your email.';
							res.status(400).json(errors);
						}
					})
					.catch((err) => {
						errors.db = 'Bad request';
						res.status(400).json(errors);
					});
			}
		})
		.catch((err) => {
			errors.db = 'Bad request';
			res.status(400).json(errors);
		});
});

/* Add a 'resend_email' route with crypto.randomBytes again to generate a fresh token: */
router.post("/resend_email", (req, res) => {

  const { errors, isValid } = checkResendField(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  let resendToken;
  crypto.randomBytes(48, (err, buf) => {
    if (err) throw err;
    resendToken = buf
      .toString("base64")
      .replace(/\//g, "")
      .replace(/\+/g, "-");
    return resendToken;
  });
  /*
  add two database calls within the '/resend_email/ route:
  Using the email passed to the resend_route, check if the email exists and if email has not been verified. Send the token if so. */

  database
    .table("users")
    .select("*")
    .where({ email: req.body.email })
    .then(data => {
      if (data.length == 0) {
        errors.invalid = "Invalid email address. Please register again!";
        res.status(400).json(errors);
      } else {
        database
          .table("users")
          .returning(["email", "token"])
          .where({ email: data[0].email, emailverified: "false" })
          .update({ token: resendToken, createdtime: Date.now() })
          .then(result => {
            if (result.length) {
              let to = [result[0].email];

              let link =
                "https://yourWebsite/v1/users/verify/" + result[0].token;

              let sub = "Confirm Registration";

              let content =
                "<body><p>Please verify your email.</p> <a href=" +
                link +
                ">Verify email</a></body>";
              sendEmail.Email(to, sub, content);

              res.json("Email re-sent!");
            } else {
              errors.alreadyVerified =
                "Email address has already been verified, please login.";
              res.status(400).json(errors);
            }
          })
          .catch(err => {
            errors.db = "Bad request";
            res.status(400).json(errors);
          });
      }
    })
    .catch(err => {
      errors.db = "Bad request";
      res.status(400).json(errors);
    });
});
module.exports = router;
