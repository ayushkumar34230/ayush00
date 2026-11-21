# 🎨 My Art Gallery — Modern Online Painting Gallery

A complete, modern, professional, and responsive website built for fine artists, painters, and art galleries to upload, showcase, and manage paintings publicly across desktop, tablet, and mobile devices.

---

## 🌟 Key Features

### 1. 🏛️ Home Page
- **Prestige Fine Art Aesthetic**: Dark obsidian canvas, champagne gold accents, serif typography (*Playfair Display*, *Cinzel*, and *Plus Jakarta Sans*).
- **Welcome Message**: *"Welcome to My Creative World"*.
- **Interactive Spotlight Showcase**: Highlights featured artworks with interactive frame preview.
- **Mediums of Expression**: Dedicated showcase for Oil, Watercolor, Acrylic, and Digital disciplines.
- **Smooth Navigation**: Sticky blurred glass navbar with mobile slide-in menu.

### 2. 🖼️ Public Gallery
- **Accessible to Everyone**: All visitors can view artworks freely without any registration or login.
- **Responsive Masonry Grid**: Dynamic cards displaying artwork thumbnail, title, artist name, medium, dimensions, and engagement metrics.
- **HD Lightbox & Zoom Inspection**:
  - Full-size high-resolution artwork viewer.
  - Interactive Zoom Controls (**Zoom In**, **Zoom Out**, **Reset 100%**).
  - Complete artwork metadata table (Medium, Dimensions, Year, Status, Valuation).
  - Narrative story behind the painting.
  - Interactive **Like Button** with live animated counters.
  - One-click **Share** (Web Share API / Clipboard) and **Inquire to Acquire** buttons.
- **Search & Filter Suite**:
  - Real-time search across titles, artists, descriptions, and materials.
  - Category filter pills: *All, Oil, Acrylic, Watercolor, Abstract, Landscape, Portrait, Digital, Sketches*.
  - Sorting: *Newest First, Most Appreciated, Title (A-Z)*.

### 3. ☁️ Upload Painting
- **Drag & Drop Upload Zone**: Support for **JPG, JPEG, PNG, and WEBP** images.
- **Real-time Image Validation**: File type validation, image dimensions calculation, and 15MB file size limit.
- **Instant Image Preview**: Displays image dimensions and file size before upload.
- **Comprehensive Artwork Details**:
  - Painting Title (Required)
  - Artist Name (Required)
  - Category / Style selector
  - Medium & Materials
  - Dimensions
  - Creation Year
  - Valuation / Price & Availability Status
  - In-depth painting description & story
- **Progress Bar**: Real-time 0% to 100% upload indicator connected to Firebase Cloud Storage.

### 4. 🛡️ Admin Dashboard & Security
- **Secure Authentication**: Integrated with Firebase Authentication (Email & Password).
- **Control Center Metrics**:
  - Total Paintings in gallery
  - Total Likes & Appreciations
  - Gallery Impressions
  - Category & Medium distribution progress bars
- **Artworks Management Table**:
  - Searchable list of all gallery pieces.
  - Quick thumbnail preview with zoom hint.
  - **Edit Artwork Details**: Interactive modal to update title, medium, dimensions, price, status, or description.
  - **Permanent Deletion**: Removes the painting document from Cloud Firestore and permanently deletes the image file from Firebase Cloud Storage with a safe confirmation dialog.
- **Administrator Access**: Requires Firebase Authentication to be configured; demo credentials are not enabled.

### 5. 🧑‍🎨 About the Artist Page
- Artist biography and studio background.
- Creative philosophy and artistic mission quote.
- Gallery vision highlighting global public access, authenticity, and direct artist collaboration.

### 6. 📬 Contact & Studio Inquiries
- Professional inquiry form (Name, Email, Subject, Message) directly stored in Firestore (`inquiries` collection).
- Studio physical atelier address, direct email, and visiting hours.
- Social media connections: Instagram, Pinterest, Behance, ArtStation, and Twitter/X.

---

## 📁 Project Structure

```
my-art-gallery/
├── index.html              # Main Single Page Application shell
├── css/
│   └── style.css           # Modern luxury gallery stylesheet & responsive layout
├── js/
│   ├── firebase-config.js  # Firebase modular initialization & config wizard
│   ├── auth.js             # Firebase Authentication & Admin session manager
│   ├── storage.js          # Firebase Cloud Storage upload & file validation
│   ├── db.js               # Cloud Firestore database operations & queries
│   ├── sample-data.js      # Curated initial artwork seed collection
│   ├── admin.js            # Admin dashboard logic, metrics & table manager
│   └── app.js              # Application router, UI events, lightbox & modals
├── firestore.rules         # Secure database rules (public read, admin write)
├── storage.rules           # Secure storage rules (public read, 15MB limit)
├── firebase.json           # Firebase Hosting configuration
├── server.py               # Local Python development server (zero dependencies)
└── README.md               # Complete documentation & deployment guide
```

---

## 🚀 How to Run Locally

### Option 1: Using the Included Python Server (Recommended)
Open your terminal and run:

```bash
cd /Users/ayushkumar/Desktop/ayush00
python3 server.py
```

Then open your browser at:
👉 **`http://localhost:8080`**

### Option 2: Direct Browser Open
You can also open `index.html` directly in any modern browser (Chrome, Safari, Edge, Firefox).

---

## 🔗 Connecting Your Live Firebase Backend

The website includes a built-in **Firebase Integration Wizard** and full support for Firebase Cloud Services.

### Step 1: Create a Free Firebase Project
1. Visit the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g. `my-art-gallery`).
3. Disable Google Analytics (optional) and click **Create Project**.

### Step 2: Enable Firebase Authentication
1. In the Firebase console left menu, click **Build > Authentication**.
2. Click **Get Started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. Click **Users > Add user** and create your admin account:
   - **Email:** `admin@myartgallery.com` (or your personal email)
   - **Password:** A strong password of your choice.

### Step 3: Enable Cloud Firestore Database
1. In the left menu, click **Build > Firestore Database**.
2. Click **Create database**, select a location near you, and choose **Start in test mode** (or production mode).
3. Under the **Rules** tab, paste the contents of `firestore.rules` included in this project.

### Step 4: Enable Cloud Storage
1. In the left menu, click **Build > Storage**.
2. Click **Get Started** and accept the default security bucket.
3. Under the **Rules** tab, paste the contents of `storage.rules` included in this project.

### Step 5: Connect Your Credentials
1. In Firebase Console, click the **Gear Icon (Project Settings) > General**.
2. Scroll to **Your apps**, click the Web icon (`</>`), and register your web app.
3. Copy your `firebaseConfig` object and either:
   - Click **Connect Firebase** in the top banner of the website and paste your keys in the UI; **OR**
   - Open `js/firebase-config.js` and replace the placeholder values in `defaultFirebaseConfig`.

---

## 🌐 How to Publish & Deploy Online (Free)

### Method A: Deploy to Firebase Hosting (Official & Fast)
1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Login and initialize:
   ```bash
   firebase login
   firebase init
   ```
   - Select **Hosting, Firestore, Storage**.
   - Select your existing Firebase project.
   - For public directory, enter `.` (current directory).
   - Configure as single-page app: **Yes**.
3. Deploy everything with one command:
   ```bash
   firebase deploy
   ```
   Your gallery will be live instantly at `https://<your-project-id>.web.app` with free SSL and worldwide Google CDN!

### Method B: Deploy to Netlify (100% Free & No Command Line Needed)
1. Go to [Netlify.com](https://www.netlify.com/) and sign up.
2. Go to **Sites > Add new site > Deploy manually**.
3. Drag and drop the `my-art-gallery` folder onto the Netlify drop zone.
4. Your website is published immediately with a custom link and free HTTPS!

### Method C: Deploy to GitHub Pages
1. Create a new GitHub repository called `my-art-gallery`.
2. Push the files to the `main` branch.
3. In repository **Settings > Pages**, select **Branch: main / root** and click Save.
4. Your site will be live at `https://<username>.github.io/my-art-gallery`.

---

## 🔐 Security Summary
- **Public Visitors**: Can view all paintings, search, filter, zoom in lightbox, read descriptions, and like artworks.
- **Protected Operations**: Only authenticated admins can upload new paintings, edit painting metadata, or delete paintings permanently from Cloud Storage and Firestore.
- **File Validation**: Enforces image-only MIME types and prevents uploading files larger than 15MB.
