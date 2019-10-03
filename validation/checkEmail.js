// We will use this file in our forgot password route to check if the user is using a valid email address.
const Validator = require("validator");
const ifEmpty = require("./checkForEmpty");

module.exports = function validateResetInput(data) {
  let errors = {};

  data.email = !ifEmpty(data.email) ? data.email : "";

  if (Validator.isEmpty(data.email)) {
    errors.email = "Email is required";
  }
  if (!Validator.isEmail(data.email)) {
    errors.email = " Email is invalid";
  }
  return {
    errors,
    isValid: ifEmpty(errors)
  };
};