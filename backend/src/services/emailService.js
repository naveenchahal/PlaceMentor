import * as Brevo from "@getbrevo/brevo";
import axios from "axios";

// ✅ Brevo client setup
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

export const isValidEmail = async (email) => {
  const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!formatOk) return { valid: false, reason: "Invalid email format" };

  try {
    const response = await axios.get(
      "https://emailvalidation.abstractapi.com/v1/",
      {
        params: {
          api_key: process.env.ABSTRACT_API_KEY,
          email,
        },
        timeout: 5000,
      }
    );

    const data = response.data;

    if (data.deliverability === "UNDELIVERABLE") {
      return { valid: false, reason: "This email address does not exist" };
    }

    if (data.is_disposable_email?.value === true) {
      return { valid: false, reason: "Disposable emails are not allowed" };
    }

    return { valid: true };

  } catch (err) {
    console.warn("Email validation API error:", err.message);
    return { valid: true };
  }
};

const sendOTP = async (email, otp) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.sender = {
    name: "PlaceMentor",
    email: process.env.EMAIL_USER, // ✅ apni Gmail — koi domain nahi chahiye
  };
  sendSmtpEmail.to = [{ email }];
  sendSmtpEmail.subject = "Your OTP - PlaceMentor";
  sendSmtpEmail.htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="color: #6366f1;">PlaceMentor</h2>
      <p>Your OTP for verification is:</p>
      <h1 style="color: #6366f1; letter-spacing: 8px;">${otp}</h1>
      <p>This OTP expires in <strong>5 minutes</strong>.</p>
      <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (err) {
    console.error("Brevo error:", err.message);
    throw new Error("EMAIL_SEND_FAILED");
  }
};

export default sendOTP;