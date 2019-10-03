const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
// const sendEmail = require("../../utilities/sendSes");
const sendEmail = require('../../utilities/sendEmail');
const database = require('../../database');
// Validation
const checkRegistrationFields = require('../../validation/register');
// Resend email validaiton
const checkResendField = require('../../validation/resend');
// Secret key
const key = require('../../utilities/keys');
// Login validation
const validateLoginInput = require('../../validation/login');
const validateResetInput = require('../../validation/checkEmail');
const validatePasswordChange = require('../../validation/newPassword');

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
					sendEmail.Email(to, sub, content);

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
						else {
							/* If token is absent there could be two possibilities, the user did not register or the token has expired: */
							errors.email_invalid =
								'Email invalid. Please check if you have registered with the correct email address or re-send the verification link to your email.';
							res.status(400).json(errors);
						}
					})
					.catch((err) => {
						console.log(err);
						errors.db = 'Bad request';
						res.status(400).json(errors);
					});
			}
		})
		.catch((err) => {
			console.log(err);
			errors.db = 'Bad request';
			res.status(400).json(errors);
		});
});

/* Add a 'resend_email' route with crypto.randomBytes again to generate a fresh token: */
router.post('/resend_email', (req, res) => {
	const { errors, isValid } = checkResendField(req.body);

	if (!isValid) {
		return res.status(400).json(errors);
	}

	let resendToken;
	crypto.randomBytes(48, (err, buf) => {
		if (err) throw err;
		resendToken = buf.toString('base64').replace(/\//g, '').replace(/\+/g, '-');
		return resendToken;
	});
	/*
  add two database calls within the '/resend_email/ route:
  Using the email passed to the resend_route, check if the email exists and if email has not been verified. Send the token if so. */

	database
		.table('users')
		.select('*')
		.where({ email: req.body.email })
		.then((data) => {
			if (data.length == 0) {
				errors.invalid = 'Invalid email address. Please register again!';
				res.status(400).json(errors);
			}
			else {
				database
					.table('users')
					.returning([
						'email',
						'token'
					])
					.where({ email: data[0].email, emailverified: 'false' })
					.update({ token: resendToken, createdtime: Date.now() })
					.then((result) => {
						if (result.length) {
							let to = [
								result[0].email
							];

							let link = 'https://yourWebsite/v1/users/verify/' + result[0].token;

							let sub = 'Confirm Registration';

							let content =
								'<body><p>Please verify your email.</p> <a href=' + link + '>Verify email</a></body>';
							sendEmail.Email(to, sub, content);

							res.json('Email re-sent!');
						}
						else {
							errors.alreadyVerified = 'Email address has already been verified, please login.';
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

/* Now start creating the route at the bottom of users.js (Not below module.exports of course) with your validation function: */

// Login route
router.post('/login', (req, res) => {
	// Ensures that all entries by the user are valid
	const { errors, isValid } = validateLoginInput(req.body);

	if (!isValid) {
		return res.status(400).json(errors);
	}
	else {
		/* And add a database call that selects id, email and password if the email in the database matches the email being used to login and only if they have verified their email: */

		database
			.select('id', 'email', 'password')
			.where('email', '=', req.body.email)
			.andWhere('emailverified', true)
			.from('users')
			.then((data) => {
				/* In the .then of the database call, we use a bcrypt function called compare to compare the password your user is attempting to log in with to the hashed password in your database: */

				bcrypt.compare(req.body.password, data[0].password).then((isMatch) => {
					if (isMatch) {
						/* If the passwords match, we use jsonwebtoken's sign function to create a signed token using or secret key and set it to expire after 1 hour (use a lower number for even better security): */

						const payload = { id: data[0].id, email: data[0].email };
						jwt.sign(payload, key.secretOrKey, { expiresIn: 3600 }, (err, token) => {
							/* This payload contains a users id and email. You can send anything you want in the payload but it is not recommended to send the password.

Finally return the token with status 200 else return status 400 with a "Bad request" message */

							res.status(200).json('Bearer ' + token);
						});
					}
					else {
						res.status(400).json('Bad request');
					}
				});
			})
			.catch((err) => {
				console.log(err);
				res.status(400).json('Bad request');
			});
	}
});

/* forgot password route
 */
router.post('/forgot', function(req, res) {
	const { errors, isValid } = validateResetInput(req.body);

	if (!isValid) {
		return res.status(400).json(errors);
	}
	let resetToken;
	crypto.randomBytes(48, (err, buf) => {
		if (err) throw err;
		resetToken = buf.toString('hex');
		return resetToken;
	});

	/* Notice this route starts off like our '/register' and '/resend_email' routes where we validate the users input and if it's good, we pseudo-randomly generate a token with crypto.randomBytes. In production you might want to use something more secure like an RSA key pair.

Now let's you'll use KnexJS again to make a database call to the users table and check if the email sent by the user exists: */

	database
		.table('users')
		.select('*')
		.where('email', req.body.email)
		.then((emailData) => {
			if (emailData.length == 0) {
				res.status(400).json('Invalid email address');
			}
			else {
				/* If the email doesn't exist in the database, return a 400 error with "Invalid email address" as our JSON response.

If it does exist, make another call to the users table and update those 3 new columns we setup in the last step with a reset token and the current date: */

				database
					.table('users')
					.where('email', emailData[0].email)
					.update({
						reset_password_token: resetToken,
						reset_password_expires: Date.now(),
						reset_password_token_used: false
					})
					/* Finish the route off with a '.then' to send an email to the user with the token and add catch any errors that might come up: */

					.then((done) => {
						let to = [
							req.body.email
						];

						let link = 'https://yourWebsite/v1/users/verify/' + resetToken;

						let sub = 'Reset Password';

						let content =
							'<body><p>Please reset your password.</p> <a href=' + link + '>Reset Password</a></body>';
						//Passing the details of the email to a function allows us to generalize the email sending function
						sendEmail.Email(to, sub, content);

						res.status(200).json('Please check your email for the reset password link');
					})
					.catch((err) => {
						console.log(err);
						res.status(400).json('Bad Request');
					});
			}
		})
		.catch((err) => {
			console.log(err);
			res.status(400).json('Bad Request');
		});
});
/* By now this route should look quite familiar as it is a mixture of some of our other routes. What is going on here: 1. The route takes a token as a parameter 2. Check that the token exists and has not been used before 3. If token is good, validate the new password 4. If pasword is valid, update the password for the user associated with the token 5. Send an email to the user telling them about their password change */
// Reset password
router.post("/reset_password/:token", function(req, res) {
  const { token } = req.params;
  database
    .select(["id", "email"])
    .from("users")
    .where({ reset_password_token: token, reset_password_token_used: false })
    .then(data => {
      if (data.length > 0) {
        const { errors, isValid } = validatePasswordChange(req.body);

        if (!isValid) {
          return res.status(400).json(errors);
        } else {
					bcrypt.genSalt(12, (err, salt) => {
          if (err) throw err;
          bcrypt.hash(req.body.password1, salt, (err, hash) => {
            if (err) throw err;
            database("users")
              .returning("email")
              .where({ id: data[0].id, email: data[0].email })
              .update({ password: hash, reset_password_token_used: true })
              .then(user => {
                const subject = "Password change for your account.";
                const content = `The password for your account registered under ${
                  user[0]
                } has been successfully changed.`;
                res.json("Password successfully changed for " + user[0] + "!");

                sendEmail.Email(to, subject, content);
              })
              .catch(err => {
                res.status(400).json(errors);
              });
          });
        })
      } else {
        res.status(400).json("Password reset error!");
      }
    })
    .catch(err => res.status(400).json("Bad request"));
});

module.exports = router;
