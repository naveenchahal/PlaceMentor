import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const isValidEmail = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(email)) return { valid: false, reason: "Invalid email format" };
  return { valid: true };
};

// ✅ Generic email — streak reminders ke liye
export const sendEmail = async (email, subject, html) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "PlaceMentor <noreply@placementor.xyz>",
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Email sent:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return { success: false, error: err.message };
  }
};

// ✅ OTP sender
const sendOTP = async (email, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "PlaceMentor <noreply@placementor.xyz>",
      to: email,
      subject: "Your OTP - PlaceMentor",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #6366f1;">PlaceMentor</h2>
          <p>Your OTP for verification is:</p>
          <h1 style="color: #6366f1; letter-spacing: 8px;">${otp}</h1>
          <p>This OTP expires in <strong>5 minutes</strong>.</p>
          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Email sent:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return { success: false, error: err.message };
  }
};

export default sendOTP;