# 🌍 Terra Nova
### Empowering Communities. Restoring Our Planet.

**Terra Nova** is a modern environmental impact platform designed to connect people with sustainability campaigns, environmental projects, and community-driven initiatives. It empowers individuals to contribute to a greener future through donations, volunteering, and environmental awareness.

Our mission is to make environmental action accessible, transparent, and impactful.

---

## 🌱 Overview

Terra Nova provides a centralized platform where users can discover environmental initiatives, support sustainability projects, explore educational content, and track their contributions through a personalized dashboard.

The platform also provides a powerful administration system for managing projects, campaigns, users, and website content.

---

## ✨ Key Features

### 🌳 Environmental Campaigns
- Browse environmental campaigns and sustainability initiatives.
- Explore detailed project descriptions and impact information.
- Discover ongoing and completed environmental projects.

### 💚 Donations & Volunteering
- Support environmental projects through donations.
- Register for community volunteering opportunities.
- Contribute to meaningful environmental initiatives.

### 📰 Journal & Impact Stories
- Explore environmental articles and educational resources.
- Discover author profiles and community stories.
- Read about real-world sustainability initiatives.

### 👤 User Authentication
- Secure user registration and login.
- JWT-based authentication.
- Optional Google OAuth integration.
- Personalized user dashboard.

### 📊 User Dashboard
- View supported environmental projects.
- Track personal project contributions.
- Manage volunteering activities and account information.

### 🛠️ Admin Dashboard
- Manage environmental projects and campaigns.
- Manage registered users and members.
- Manage subscribers and inquiries.
- Control journal articles and website content.
- Monitor platform activities.

### 🔐 Environmental Impact Records
- Generate signed environmental impact records.
- Verify record authenticity using digital signatures.
- Maintain transparent records based on user-provided estimates.

### 🤖 Optional AI Integration
- AI-powered environmental assistance.
- Gemini API integration.
- OpenAI API integration.
- Intelligent conversational support.

### 💳 Payment Integration
- Stripe checkout integration.
- Secure payment processing.
- Stripe webhook support for payment events.

---

## 🧰 Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and responsive layouts |
| JavaScript | Frontend functionality |
| Node.js | Backend runtime |
| Express.js | Backend framework |
| MongoDB | Database |
| JWT | Authentication |
| Stripe | Payment integration |
| Google OAuth | Social authentication |
| Gemini API | AI integration |
| OpenAI API | AI integration |

---

## 📁 Project Structure

```text
Terra-Nova/
│
├── public/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── assets/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
│
├── views/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── DEPLOYMENT.md
└── README.md
```

*Note: The structure above represents a suggested organization. Actual directories may differ depending on your implementation.*

---

## ⚙️ Prerequisites

Before running Terra Nova locally, make sure you have installed:

- **Node.js:** Version 18 or newer.
- **npm:** Node Package Manager.
- **MongoDB:** Local MongoDB installation or a MongoDB connection string.
- **Git:** For source code management.

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate to the Project

```bash
cd Terra-Nova
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

Use `.env.example` as your configuration reference.

```env
PORT=3000

MONGODB_URI=mongodb://127.0.0.1:27017/terra-nova
MONGODB_DB=terra-nova

JWT_SECRET=your_secure_jwt_secret

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password

# Stripe Configuration
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Google OAuth Configuration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# AI Configuration
GEMINI_API_KEY=
OPENAI_API_KEY=
```

**Important:** Never upload your `.env` file or expose API keys and passwords in a public repository.

### 5. Start MongoDB

Make sure your MongoDB database is running before using database-dependent features.

### 6. Start the Development Server

```bash
npm run dev
```

Alternatively:

```bash
npm start
```

### 7. Open the Application

Visit the following URL in your browser:

**http://localhost:3000**

---

## 🌐 Application Routes

| Route | Description |
|---|---|
| `/` | Homepage |
| `/campaigns` | Environmental campaign directory |
| `/campaign/:id` | Individual campaign details |
| `/blog` | Environmental journal |
| `/stories` | Community impact stories |
| `/dashboard` | User project dashboard |
| `/admin` | Administrative dashboard |

---

## 🔌 Third-Party Integrations

Terra Nova supports optional third-party services:

| Service | Integration |
|---|---|
| Stripe | Donations and payment processing |
| Google OAuth | Google authentication |
| Gemini | AI-powered chat |
| OpenAI | AI-powered chat |

These integrations require their respective API credentials and environment variables. They remain unavailable until properly configured.

---

## 🔒 Security

Security considerations include:

- JWT-based authentication.
- Secure environment variable management.
- Protected administrative functionality.
- Server-side payment verification.
- Stripe webhook signature verification.
- Secure handling of third-party API credentials.

For production deployment, configure HTTPS, secure cookies where applicable, input validation, rate limiting, and appropriate database access controls.

---

## 🌍 Environmental Impact Disclaimer

Environmental impact records generated by Terra Nova are based on user-provided estimates and platform calculations.

These records are intended for informational and transparency purposes only.

**They are not third-party carbon credits, carbon offsets, independently verified emissions reductions, or certified environmental audits.**

---

## 🚀 Future Enhancements

Potential future improvements include:

- Advanced environmental analytics dashboard.
- Interactive project impact visualizations.
- Real-time campaign progress tracking.
- Community engagement features.
- Enhanced AI environmental assistant.
- Automated impact reporting.
- Improved mobile responsiveness.

---

## 🤝 Contributing

Contributions are welcome!

If you would like to improve Terra Nova:

1. Fork the repository.
2. Create a new feature branch.
3. Implement your changes.
4. Commit your changes.
5. Submit a Pull Request.

```bash
git checkout -b feature/your-feature
git add .
git commit -m "Add: your feature"
git push origin feature/your-feature
```

---

## 📄 License

No license has currently been specified for this project.

All rights and permissions should be clarified before redistributing or reusing the source code.

---

<div align="center">

### 🌱 Terra Nova

**Building a Sustainable Future, Together.**

*Small Actions. Meaningful Impact. A Greener Tomorrow.*

</div>
