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
