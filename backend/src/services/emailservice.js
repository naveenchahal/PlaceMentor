import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// sendOTP — original function (still works)
const sendOTP = async (email, otp, customSubject, customHtml) => {
  const subject = customSubject || "Your OTP Code — PlaceMentor";
  const html = customHtml || `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0ea5e9;">PlaceMentor</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 8px; color: #0ea5e9; font-size: 36px;">${otp}</h1>
      <p style="color: #64748b;">Valid for 5 minutes. Do not share this code.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"PlaceMentor" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html
  });
};

export default sendOTP;