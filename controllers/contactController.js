

const nodemailer = require("nodemailer");
const Contact = require("../models/Contact");

const sendMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        msg: "All fields (name, email, subject, message) are required",
      });
    }

    // ✅ Save message to DB (optional, for history/tracking)
    const newMessage = new Contact({ name, email, subject, message });
    await newMessage.save();

    // ✅ Setup transporter (Gmail example)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email (from .env)
        pass: process.env.EMAIL_PASS, // App password (NOT Gmail password)
      },
    });

    // ✅ Email options
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_USER, // Receiver (your inbox)
      subject: `📩 New Contact Form: ${subject}`,
      text: `
You have received a new message from the contact form.

🧑 Name: ${name}
📧 Email: ${email}
📝 Subject: ${subject}

Message:
${message}
      `,
    };

    // ✅ Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.response);

    return res.status(200).json({
      success: true,
      msg: "Message sent successfully!",
    });
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    return res.status(500).json({
      success: false,
      msg: "Failed to send message",
      error: error.message, // helpful for debugging
    });
  }
};

module.exports = { sendMessage };
