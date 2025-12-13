# SmartMatch: An Autonomous, AI-Powered Smartphone Recommendation PWA

SmartMatch is a modern Progressive Web App (PWA) that helps users find their perfect smartphone. It features a fast, intuitive frontend and a fully autonomous backend pipeline that uses **Google Gemini** with live Google Search to **discover new phones, generate expert-level reviews, and perform daily data maintenance**.

This project is architected for a professional, cost-effective, and automated cloud deployment using a "GitOps" workflow, which is perfect for platforms like DigitalOcean App Platform, Vercel, or Netlify.

---

## 🛠️ Tech Stack

- **Frontend (PWA):**
  - **Framework/Language:** React & TypeScript
  - **Styling:** Tailwind CSS
  - **Bundler:** Vite
  - **Offline Capabilities:** PWA with Service Worker (`vite-plugin-pwa`)

- **Backend (Data Pipeline):**
  - **Runtime:** Node.js
  - **Automation:** GitHub Actions
  - **AI Models:**
    - **`gemini-2.5-pro`:** For high-quality, in-depth review generation.
    - **`gemini-2.5-flash`:** For fast and efficient new phone discovery and daily data updates (prices, software versions).
  - **Environment:** dotenv (for local development)

- **Serverless Functions:**
  - **IP Geolocation:** A Node.js serverless function (`/api/get-location`) provides approximate user location for regional content.

---

## 🏗️ Architecture: The GitOps Approach

The project is decoupled into two main components that work together through your Git repository:

1.  **The PWA (User-Facing App):** A pure static application. On startup, it fetches the pre-generated `public/data/phones.json` file. This means **all phone data and AI reviews load instantly for the user**. The app is fast, secure, and contains no backend logic or secret keys. It also includes a serverless function for IP-based geolocation to tailor content like currency.

2.  **The Data Pipeline (GitHub Action):** A scheduled, automated workflow defined in `.github/workflows/update_reviews.yml`. This pipeline runs twice daily and executes a series of scripts in a specific order to keep the database fresh and accurate.
    - **Stage 1: Daily Maintenance (`update-prices.js`, `update-software.js`):**
      - **Price Updates:** Checks for phones whose prices haven't been updated in the last 24 hours and fetches the latest regional pricing (USD, EUR, GBP, INR) using `gemini-2.5-flash`.
      - **Software Updates:** On a 30-day cycle, it checks for and updates the latest OS version for each phone.
    - **Stage 2: Granular Discovery (`discover.js`):** Uses a series of targeted prompts (e.g., "top budget phones," "top camera phones") to ask `gemini-2.5-flash` to find a diverse range of phones. It intelligently avoids adding duplicates.
    - **Stage 3: Dynamic Enrichment (`enrich.js`):** The "Analyst Bot" finds any phones with placeholder data or those due for a re-review based on a dynamic schedule (e.g., new phones are reviewed daily, older phones monthly). It uses the powerful `gemini-2.5-pro` model with live Google Search to generate a high-quality, structured review. This script is **token-aware**; it processes as many phones as it can within a set token budget for each run, ensuring it stays within API free tiers.
    - **Stage 4: Validation (`validate-json.js`):** Before committing, a validation script runs to ensure the `phones.json` file is not corrupt and that all entries have the correct data structure. This prevents bad data from ever reaching production.
    - **Commit & Deploy:** If the `public/data/phones.json` file is updated and validated, the GitHub Action **commits the file back to the repository**. This commit automatically triggers a new deployment of the static site on your hosting provider (like DigitalOcean), ensuring the app's data is always fresh.

---

## ✨ What Makes SmartMatch Special?

While product recommendation quizzes and expert review sites exist, SmartMatch is unique in how it combines these concepts into a fully autonomous, self-maintaining system.

**1. Fully Autonomous Content Generation:**
Unlike traditional review sites that rely on manual labor, SmartMatch requires **no human effort** to create new, detailed phone reviews. The AI "Analyst Bot" acts as a tireless expert, working 24/7.

**2. Self-Updating and "Live" Data:**
The data pipeline runs twice daily. This means the app can discover new phones as they are released, update prices, and re-evaluate existing phones, ensuring the data is always fresh and relevant—a significant advantage over static, human-written reviews.

**3. AI-Driven Consensus:**
A single human reviewer can have biases. The AI, by design, synthesizes a **consensus** from multiple authoritative sources and user forums. This results in a more objective and balanced review than any single person could write.

**4. Elegant and Cost-Effective Architecture:**
The project uses a modern "GitOps" approach, leveraging the Git repository as a database and GitHub Actions as a serverless backend. This is an incredibly powerful, scalable, and low-cost (often free) way to manage a live data pipeline.

In short, SmartMatch is not just a PWA; it's a tiny, autonomous, self-healing version of a tech review site that runs itself.

---

## 🚀 Local Development

Follow these steps to run the app and the AI pipeline on your local machine.

### 1. Running the PWA (Frontend)

1.  **Prerequisites:** Node.js and npm installed.
2.  **Setup:**
    ```sh
    npm install
    ```
3.  **Run:**
    ```sh
    npm run dev
    ```
    This will start the Vite development server, usually on `http://localhost:3000`.

### 2. Running the AI Data Pipeline (Backend)

The pipeline will automatically discover and enrich your database with AI-generated content.

1.  **Prerequisites:**
    - Node.js and npm installed.
    - A free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

2.  **Setup:**
    - Navigate to the `scraper` directory:
      ```sh
      cd scraper
      ```
    - Install dependencies:
      ```sh
      npm install
      ```
    - Create a `.env` file in the `scraper` directory.
    - Open the `.env` file and **paste your Google Gemini API key** into it. The file should look like this:
      ```
      API_KEY="AIzaSy...Your_Key_Here...gKE"
      ```

3.  **Execute the Pipeline:**
    - From inside the `scraper` directory, run the start command:
      ```sh
      npm start
      ```
    - The script will first discover new phones and then generate reviews for any phones with placeholder content. The `public/data/phones.json` file will be updated in place.

---

### ⚠️ A Note on Your API Key Security

Your Google Gemini API key is a secret and provides access to your account. **Never commit it directly into your code or share it publicly.**

-   **For local development:** This project uses a `.env` file to keep your key safe. This file is included in the project's `.gitignore` file to prevent it from ever being committed.
-   **For deployment:** Always use the secure "Secrets" feature provided by your CI/CD platform (like the GitHub Actions secrets described below).

---

## ☁️ Deployment Guide (Vercel + GitHub)

This guide explains how to deploy SmartMatch using **Vercel**, which is perfectly suited for this project's architecture (Vite frontend + serverless API functions) and offers a generous free tier.

### Step 1: Deploy the App on Vercel

1.  Go to vercel.com and sign up for a free account using your GitHub profile.
2.  On your Vercel dashboard, click **Add New...** > **Project**.
3.  Select your GitHub repository for this project and click **Import**.
4.  Vercel will automatically detect that it's a Vite project. It will pre-fill all the correct settings for you. You don't need to change anything.
5.  Click **Deploy**. Vercel will build your site and deploy it. It will also automatically find and deploy the serverless function in your `/api` directory.
6.  Any future pushes to your `main` branch will trigger a new deployment automatically.

### Step 2: Set Up the API Key in GitHub Secrets

To allow the GitHub Action to use the Gemini API securely, you must store your API key as a secret.

1.  In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2.  Click **New repository secret**.
3.  Name the secret `API_KEY`.
4.  Paste your Google Gemini API key into the "Value" field.
5.  Click **Add secret**.

### Step 3: Enable the GitHub Action

The workflow file is already included in `.github/workflows/update_reviews.yml`. It's set to run twice daily, but you can also trigger it manually.

1.  In your GitHub repository, go to the **Actions** tab.
2.  You will see a workflow named "Update Phone Reviews".
3.  The workflow is now active and will run on its schedule. To run it immediately, click on the workflow, then select **Run workflow** from the dropdown on the right.

**That's it!** Your app is now live, and your data pipeline is fully automated. When the GitHub Action runs, it will perform all data maintenance and commit the updated `public/data/phones.json` to your repository. This will automatically trigger Vercel to redeploy your site with the fresh data.
