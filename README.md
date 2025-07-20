# DevDrop

DevDrop is a modern, collaborative code editor built with Next.js, Firebase, and CodeMirror. It enables real-time editing, sharing, and management of code snippets with a developer-friendly interface and robust cloud backend.

---

## 🚀 Features

- **Realtime Collaborative Editing** powered by Firebase
- **Multi-language Syntax Highlighting** (JavaScript, Python, Java, TypeScript, JSON, and more)
- **VS Code-inspired Theming** (One Dark)
- **Note Management**: Create, rename, and delete notes
- **Download Snippets** in your preferred language format
- **Responsive UI** for all devices
- **Built with Next.js App Router, Tailwind CSS, and Geist Fonts**

---

## 🛠️ Getting Started

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

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Realtime Database** and set read/write rules.
3. Enable **Anonymous Authentication** for live presence features.
4. Copy your Firebase configuration and add it to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to start collaborating!

---

## 📁 Folder Structure

- `app/` - Next.js App Router pages
- `components/` - React components (CodeEditor, NoteList, etc.)
- `lib/` - Firebase config and authentication logic
- `public/` - Favicons and static assets
- `styles/` - Tailwind and global styles

---

## 🌍 Deployment

Deploy instantly using [Vercel](https://vercel.com/) for best performance and scalability.

---

## 👤 About the Developer

Built with ❤️ by Vivek Kumar Verma. Connect on [GitHub](https://github.com/Vivekkumarv123) | [LinkedIn](https://linkedin.com/in/vivek-kumar-verma-programmer-information-technology)

---

## 📜 License

This project is licensed under the MIT License. Feel free to use, fork, and build upon it.

---

## ⭐️ Contribute & Star

If you find DevDrop helpful:

- ⭐️ Star the repository
- 🍴 Fork to contribute new features
- 🐞 Open issues for suggestions or bugs

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [CodeMirror Documentation](https://codemirror.net/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## Instructions

1. Copy and paste this README into your project root.
2. Replace the `git clone` URL and screenshot paths if needed.
3. Commit and push:

```bash
git add README.md
git commit -m "Add professional README for DevDrop"
git push
```

Your GitHub project will now look professional and clear for sharing, showcasing, and deploying.
