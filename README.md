# Knex/Postgres/AuthServer

## Part 3

To test, with your server running, open up postman and enter 'localhost:3000/v1/users/register' in the address bar. Select 'Body' -> 'raw' and 'JSON(application/json)' and enter in the following json. Make sure request is `POST` type.

```json
{
  "email": "tim@example.com",
  "password1": "12345678",
  "password2": "12345678"
}
```

output:

```json
{
    "id": "23f9f36d-d84d-4c6a-adba-15361599792b",
    "email": "tim@example.com",
    "registered": "1570117000602",
    "token": "PJyHmRihz71Vi8OKTbRFqPjlEfmpbrY4DNtnOrFsIbC50kQjztczcOKUOxWqyttm"
}
```

## Part 4 - Sending email

For the example code to run, you have to:

```sh
export AWS_SDK_LOAD_CONFIG=true
```

Then your `./utilities/sendEmail.js` variables will log:

```js
console.log("Region: ", aws.config);
console.log("Region: ", aws.config.region);
console.log("accessKeyId: ", aws.config.credentials.accessKeyId);
console.log("secretAccessKey: ", aws.config.credentials.secretAccessKey);
```

## Part 5 - Verifying Tokens

With your server running, take the token that you received by email in part 4 of this series (everything after 'https://yourwebsite/v1/users/verify/') in
```sh
https://yourwebsite/v1/users/verify/tsMAvkMqaj0UlbnjLIjp8D6rbeM1i7l81Rg6FHnjOQTerG9FimWZPpjFpfCE7njJ
```

and add a new post request in Postman to your 'localhost:3000/v1/users/verify/:token' route. If everything is working you should get the following message back from your API:

```text
localhost:3000/v1/users/verify/tsMAvkMqaj0UlbnjLIjp8D6rbeM1i7l81Rg6FHnjOQTerG9FimWZPpjFpfCE7njJ
```

## Token Expiry Time

Creating tokens that never expire and sending them out over the internet is not very good for security. Let's create a `./utilities/tokenExpiry.js` file in the utilities folder to fix this.

`tokenExpiry.js` contains a function that runs every 4 seconds and checks the following:

- If an hour has passed after a user has registered through the API.
- If so, the token issued to the user at the time of registration is deleted from the database.

If token expired run `./validation/resend.js` which allows user to get a new token.

Test in postman. If the email address has been registered in the database but is not yet verified an 'Email re-sent!' message is returned (and a new token is sent):

```text
localhost:3000/v1/users/resend_email/

body: { "email":"nonverified_example@test.com"}
```

I changed the expiry to one minute but need to revisit. Not getting back email resent yet.

