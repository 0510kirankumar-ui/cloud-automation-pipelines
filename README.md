# 🤖 Autonomous AI Content Curation & Syndication Engine

A production-grade, single-file JavaScript / Google Apps Script architecture designed to run on automated triggers. The script fetches real-time science/technology news via RSS, handles structured topic rotations, utilizes Google Gemini's Chain-of-Thought protocols to generate clean multi-lingual HTML blog articles, and cross-posts dynamically to Blogger CMS, Google Web Stories, and Meta/Facebook Pages.

## ✨ Core Features
*   **Chain-of-Thought AI Prompts:** Fully engineered prompts instructing Gemini to output highly structured 1,000+ word deep-dive content without rendering markdown artifacts.
*   **Dynamic Image Rotation:** Programmatically fetches and alternates multi-candidate imagery from both the Unsplash and Pexels APIs, cross-checking recent history to prevent duplicates.
*   **Rolling State Management:** Uses persistent storage arrays to dynamically track, shuffle, and cycle through keywords and media IDs across cloud runs.
*   **Multi-Lingual Curation:** Automatically generates localization snippets in Hindi and Arabic using native Google Translation services.

---

## 🚀 Deployment & Reuse Instructions

This repository is built for open-source reference. If you want to deploy this automated engine to your own Google Workspace cloud environment, follow these steps:

### 1. Initialize the Script Environment
1. Go to [Google Apps Script](https://script.google.com) and create a **New Project**.
2. Erase any default template code and copy/paste the full contents of `auto_blog_poster.js` into your editor.

### 2. Secure Your Private Access Credentials
The script uses `PropertiesService` to keep runtime API tokens completely hidden and secure. **Do not hardcode your keys.**

1. Inside your editor file, look for the `setupScriptProperties()` function.
2. Temporarily input your actual API strings into the placeholder values:
   ```javascript
   function setupScriptProperties() {
     PropertiesService.getScriptProperties().setProperties({
       'GEMINI_API_KEY':        'your-real-gemini-key',
       'UNSPLASH_ACCESS_KEY':   'your-real-unsplash-key',
       'PEXELS_API_KEY':        'your-real-pexels-key',
       'BLOG_ID':               'your-real-blogger-id',
       'FACEBOOK_PAGE_ID':      'your-real-facebook-page-id',
       'FACEBOOK_ACCESS_TOKEN': 'your-real-facebook-token'
     });
   }
