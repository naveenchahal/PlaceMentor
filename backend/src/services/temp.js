import sendOTP from "./services/emailService.js";

sendOTP("yourpersonalemail@gmail.com", "123456")
  .then(() => console.log("Mail sent"))
  .catch(err => console.error("Mail error:", err));