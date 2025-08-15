# DevDrop

DevDrop is a modern, collaborative code editor built with Next.js, Firebase, and CodeMirror. It enables real-time editing, sharing, and management of code snippets with file attachments, automatic cloud storage, and a developer-friendly interface powered by a robust cloud backend.

---

## 🚀 Features

- **Realtime Collaborative Editing** powered by Firebase Realtime Database
- **Multi-language Syntax Highlighting** (JavaScript, Python, Java, TypeScript, JSON, and more)
- **Dark/Light Theme Toggle** with smooth transitions and VS Code-inspired styling
- **File Management System** with Cloudinary integration for secure file storage
- **Smart Note Management**: Create, rename, delete notes with automatic file cleanup
- **Bulk File Operations**: Upload multiple files, bulk delete with confirmation
- **Download Snippets** in your preferred language format
- **Responsive Design** optimized for desktop, tablet, and mobile devices
- **Real-time Connection Status** with offline/online indicators
- **Debounced Auto-saving** for optimal performance
- **Search and Filter** notes by name with instant results
- **Built with Next.js 14 App Router, Tailwind CSS, Framer Motion, and Geist Fonts**

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with Hooks and Context
- **CodeMirror 6** for advanced code editing
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Lucide React** for consistent iconography

### Backend & Services
- **Firebase Realtime Database** for live collaboration
- **Firebase Authentication** (Anonymous) for session management
- **Cloudinary** for file storage and management
- **Vercel** for deployment and hosting

---

## 🎯 Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase account
- Cloudinary account (for file uploads)

### 1. Clone the Repository

```bash
git clone https://github.com/Vivekkumarv123/DevDrop.git
cd devdrop
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Realtime Database** with these security rules:

```json
{
  "rules": {
    "notes": {
      ".read": true,
      ".write": true,
      "$noteId": {
        "files": {
          ".validate": "newData.isString() || newData.hasChildren()"
        }
      }
    },
    "users": {
      "$userId": {
        "notes": {
          ".read": true,
          ".write": true,
          "$noteId": {
            "files": {
              ".validate": "newData.isString() || newData.hasChildren()"
            }
          }
        }
      }
    }
  }
}
```

3. Enable **Anonymous Authentication** in Authentication settings
4. Copy your Firebase configuration

### 4. Configure Cloudinary

1. Create account at [Cloudinary](https://cloudinary.com/)
2. Go to Settings → Upload → Add upload preset
3. Set preset mode to "Unsigned" and note the preset name
4. Get your cloud name from the dashboard

### 5. Environment Variables

Create `.env.local` in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 6. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to start collaborating!

---

## 📁 Project Structure

```
devdrop/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── cloudinary/    # File management endpoints
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── page.js            # Home page (Editor)
├── lib/                   # Utility libraries
│   └── firebase.js        # Firebase configuration
├── components/            # React components (if separated)
├── public/                # Static assets
└── README.md              # Project documentation
```

---

## 🎨 Key Components

### EditorPage
Main application container managing sidebar state and note selection.

### NoteList  
Handles note management with create, read, update, delete operations plus search functionality.

### CodeEditor
Advanced code editor with:
- Real-time collaboration
- Syntax highlighting
- Theme switching
- File attachment system
- Auto-save with debouncing
- Connection status monitoring

---

## 🔧 API Endpoints

### `/api/cloudinary/delete`
- **Method**: DELETE  
- **Purpose**: Delete single file from Cloudinary
- **Body**: `{ "public_id": "file_id" }`

### `/api/cloudinary/bulk-delete`
- **Method**: DELETE
- **Purpose**: Delete multiple files from Cloudinary  
- **Body**: `{ "public_ids": ["id1", "id2", ...] }`

---

## 🚀 Deployment

### Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com/)
3. Add your environment variables in Vercel dashboard
4. Deploy automatically on every push

### Deploy on Other Platforms

DevDrop can be deployed on any platform supporting Next.js:
- Netlify
- Railway  
- Digital Ocean App Platform
- AWS Amplify

---

## 🔐 Security Features

- **Firebase Security Rules** prevent unauthorized access
- **Environment Variable Protection** for sensitive keys
- **File Upload Validation** with size and type restrictions
- **Sanitized Firebase Keys** prevent injection attacks
- **Error Boundary Protection** for graceful failure handling

---

## 🎯 Performance Optimizations

- **Debounced Auto-saving** reduces Firebase write operations
- **RequestAnimationFrame** for smooth UI updates  
- **Memoized Components** prevent unnecessary re-renders
- **Optimized Firebase Listeners** with proper cleanup
- **Bulk Operations** for efficient file management
- **Code Splitting** with Next.js dynamic imports

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper testing
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation for new features
- Ensure responsive design compatibility

---

## 🐛 Known Issues & Roadmap

### Current Limitations
- Anonymous authentication only (no user accounts)
- No version history or branching
- Limited file type preview

### Upcoming Features
- [ ] User authentication and profiles
- [ ] Code execution and preview
- [ ] Version control with git integration
- [ ] Collaborative cursors and presence indicators
- [ ] Advanced syntax highlighting for more languages
- [ ] Export to GitHub/GitLab
- [ ] Team workspaces and permissions

---

## 📊 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Latest |
| Firefox | ✅ Latest |
| Safari | ✅ Latest |
| Edge | ✅ Latest |
| Mobile Safari | ✅ iOS 12+ |
| Mobile Chrome | ✅ Android 8+ |

---

## 👤 About the Developer

Built with ❤️ by **Vivek Kumar Verma**  

**Connect with me:**
- 🌐 GitHub: [Vivekkumarv123](https://github.com/Vivekkumarv123)
- 💼 LinkedIn: [vivek-kumar-verma-programmer-information-technology](https://linkedin.com/in/vivek-kumar-verma-programmer-information-technology)

**Other Projects:** Check out my other open-source projects on GitHub!

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - Feel free to use, modify, and distribute
- ✅ Commercial use allowed
- ✅ Modification allowed  
- ✅ Distribution allowed
- ✅ Private use allowed
```

---

## ⭐️ Support the Project

If you find DevDrop helpful:

- ⭐️ **Star the repository** to show your support
- 🍴 **Fork and contribute** new features or improvements
- 🐞 **Report issues** or suggest enhancements
- 📢 **Share with the community** on social media
- ☕ **Sponsor the project** for continued development

---

## 📚 Resources & Documentation

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features
- [Firebase Documentation](https://firebase.google.com/docs) - Firebase integration guide  
- [CodeMirror Documentation](https://codemirror.net/docs/) - Advanced editor features
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility-first styling
- [Cloudinary Documentation](https://cloudinary.com/documentation) - File management APIs
- [Framer Motion](https://www.framer.com/motion/) - Animation library guide

---

## 🙏 Acknowledgments

Special thanks to:
- **Next.js team** for the amazing React framework
- **Firebase** for reliable real-time database
- **CodeMirror** for the powerful editor foundation  
- **Tailwind CSS** for beautiful, responsive styling
- **Cloudinary** for seamless file management
- **Open source community** for inspiration and support

---

*Built for developers, by a developer. Happy coding! 🚀*