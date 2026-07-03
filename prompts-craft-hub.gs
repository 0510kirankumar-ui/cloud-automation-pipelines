// =============================================
// PROMPT CRAFT HUB 
// =============================================

const props = PropertiesService.getScriptProperties();

const GEMINI_API_KEY         = props.getProperty('GEMINI_API_KEY');
const UNSPLASH_ACCESS_KEY    = props.getProperty('UNSPLASH_ACCESS_KEY');
const PEXELS_API_KEY         = props.getProperty('PEXELS_API_KEY');
const BLOG_ID                = props.getProperty('BLOG_ID');
const FACEBOOK_PAGE_ID       = props.getProperty('FACEBOOK_PAGE_ID');
const FACEBOOK_ACCESS_TOKEN  = props.getProperty('FACEBOOK_ACCESS_TOKEN');

const MAX_POSTS_PER_RUN = 2;

// =============================================
// ONE-TIME SETUP
// Run this function ONCE from the Apps Script editor
// (select it in the function dropdown, click Run) to
// store your keys. After it runs successfully, delete
// the values below (or delete the whole function) so
// they don't sit in your code even temporarily.
// =============================================
function setupScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'GEMINI_API_KEY':        'paste-your-real-key-here',
    'UNSPLASH_ACCESS_KEY':   'paste-your-real-key-here',
    'PEXELS_API_KEY':        'paste-your-real-key-here',
    'BLOG_ID':               'paste-your-real-blog-id-here',
    'FACEBOOK_PAGE_ID':      'paste-your-real-page-id-here',
    'FACEBOOK_ACCESS_TOKEN': 'paste-your-real-token-here'
  });
  Logger.log('Script properties saved. Now delete this function or clear the values above.');
}

// Optional sanity check - run this any time to confirm
// properties are loaded without printing the actual secrets
function checkScriptProperties() {
  const keys = ['GEMINI_API_KEY','UNSPLASH_ACCESS_KEY','PEXELS_API_KEY','BLOG_ID','FACEBOOK_PAGE_ID','FACEBOOK_ACCESS_TOKEN'];
  keys.forEach(k => {
    const v = PropertiesService.getScriptProperties().getProperty(k);
    Logger.log(`${k}: ${v ? 'set (' + v.length + ' chars)' : 'MISSING'}`);
  });
}

// Keep this list larger and let rotation + shuffle handle variety.
// Add more topics any time - the script will cycle through all of
// them before repeating any one.
function getAIKeywords() {
  return [
    "best AI tools 2026",
    "how to build an AI agent from scratch",
    "different types of AI explained",
    "AI agents tutorial step by step",
    "free vs paid AI tools comparison",
    "future of AI agents in 2026",
    "AI coding assistants compared",
    "how AI is changing small business",
    "beginner mistakes when learning AI",
    "AI tools for content creators"
  ];
}

// =============================================
// ROTATION STATE (PropertiesService = persistent
// across runs, this is what was missing before)
// =============================================
function getNextKeyword() {
  const props = PropertiesService.getScriptProperties();
  const keywords = getAIKeywords();

  let usedIndexes = JSON.parse(props.getProperty('usedKeywordIndexes') || '[]');
  let remaining = keywords.map((_, i) => i).filter(i => !usedIndexes.includes(i));

  // Full cycle complete - reshuffle and start over
  if (remaining.length === 0) {
    usedIndexes = [];
    remaining = keywords.map((_, i) => i);
  }

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  usedIndexes.push(pick);
  props.setProperty('usedKeywordIndexes', JSON.stringify(usedIndexes));

  return keywords[pick];
}

// Keep a rolling history of recent titles so Gemini can be told
// explicitly "don't repeat these patterns"
function getRecentTitles() {
  const props = PropertiesService.getScriptProperties();
  return JSON.parse(props.getProperty('recentTitles') || '[]');
}

function saveRecentTitle(title) {
  const props = PropertiesService.getScriptProperties();
  let titles = getRecentTitles();
  titles.push(title);
  if (titles.length > 20) titles = titles.slice(titles.length - 20);
  props.setProperty('recentTitles', JSON.stringify(titles));
}

// Track recently used image IDs (works across both Unsplash and Pexels)
function getRecentImageIds() {
  const props = PropertiesService.getScriptProperties();
  return JSON.parse(props.getProperty('recentImageIds') || '[]');
}

function saveRecentImageId(id) {
  const props = PropertiesService.getScriptProperties();
  let ids = getRecentImageIds();
  ids.push(id);
  if (ids.length > 30) ids = ids.slice(ids.length - 30);
  props.setProperty('recentImageIds', JSON.stringify(ids));
}

// =============================================
// LATEST SCI-TECH NEWS RSS
// =============================================
function getLatestSciTechNews(limit = 3) {
  const RSS_URL = "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREp0Y2dBU0FtVnVHZ0pWVXlnQVAB?hl=en-IN&gl=IN&ceid=IN:en";

  try {
    const response = UrlFetchApp.fetch(RSS_URL, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];

    const xml = XmlService.parse(response.getContentText());
    const channel = xml.getRootElement().getChild("channel");
    const items = channel.getChildren("item");

    let newsItems = [];
    const now = new Date().getTime();

    for (let i = 0; i < items.length && newsItems.length < limit; i++) {
      const item = items[i];
      const title = item.getChildText("title") || "";
      const description = item.getChildText("description") || "";
      const link = item.getChildText("link") || "";
      const pubDate = item.getChildText("pubDate") || "";

      if (pubDate) {
        const pubTime = new Date(pubDate).getTime();
        if (now - pubTime > 48 * 60 * 60 * 1000) continue;
      }

      if (title && description) {
        newsItems.push({ title, description, link, pubDate });
      }
    }
    return newsItems;
  } catch (e) {
    Logger.log("RSS Error: " + e.message);
    return [];
  }
}

// =============================================
// MAIN AUTOMATION
// =============================================
function autoUltimateSystem() {
  Logger.log("=== AUTO RUN STARTED ===");
  let count = 0;

  // 1 AI guide post (topic picked from rotation, not always index 0/1)
  const keyword = getNextKeyword();
  runSinglePost(keyword);
  count++;
  Utilities.sleep(20000);

  // Remaining slots filled with fresh sci-tech news
  const newsItems = getLatestSciTechNews(3);
  for (let i = 0; i < newsItems.length && count < MAX_POSTS_PER_RUN; i++) {
    runSingleNewsPost(newsItems[i]);
    count++;
    Utilities.sleep(20000);
  }

  Logger.log(`=== AUTO RUN FINISHED - Total posts: ${count} ===`);
}

function testFullPost() {
  runSinglePost(getNextKeyword());
}

function testNewsPost() {
  const newsItems = getLatestSciTechNews(1);
  if (newsItems.length > 0) runSingleNewsPost(newsItems[0]);
}

function runSinglePost(keyword) {
  try {
    const title = generateSEOTitle(keyword);
    if (!title) return;

    const content = generateAIContent(keyword);
    if (content === "Content generation failed.") return;

    const imgData = fetchVariedImage(keyword + " technology");
    const fullContent = buildFullHTML(title, imgData ? buildImageHTML(imgData) : "", content,
                        translateToHindi(content), translateToArabic(content));

    const result = postToBlogger(title, fullContent);
    if (result) {
      Logger.log("Blogger Published (AI Guide): " + result.url);
      saveRecentTitle(title);
      postToFacebook(title, result.url, imgData ? imgData.image : null);
      createAndPostWebStory(keyword, title, imgData);
    }
  } catch (e) {
    Logger.log("AI Post Error: " + e.message);
  }
}

function runSingleNewsPost(newsItem) {
  try {
    const title = generateSEOTitleForNews(newsItem.title);
    const content = generateNewsContent(newsItem);
    if (content === "Content generation failed.") return;

    const imgData = fetchVariedImage(newsItem.title + " science technology");
    const fullContent = buildFullHTML(title, imgData ? buildImageHTML(imgData) : "", content,
                        translateToHindi(content), translateToArabic(content));

    const result = postToBlogger(title, fullContent);
    if (result) {
      Logger.log("Blogger Published (Sci-Tech News): " + result.url);
      saveRecentTitle(title);
      postToFacebook(title, result.url, imgData ? imgData.image : null);
      createAndPostWebStory(newsItem.title, title, imgData);
    }
  } catch (e) {
    Logger.log("News Post Error: " + e.message);
  }
}

// =============================================
// GEMINI CONTENT (chain-of-thought version kept -
// this is the good prompt that was getting shadowed)
// =============================================
function generateAIContent(keyword) {
  const prompt = `You are a true modern polymath with deep mastery in artificial intelligence, cognitive science, philosophy of technology, economics of innovation, history of computing, geopolitics, ethics, and systems thinking.

Task: Write a highly original, plagiarism-free 950-1150 word SEO blog post on "${keyword}".

=== CHAIN-OF-THOUGHT REASONING PROTOCOL ===
<thinking>
Step 1: Core Explanation - Clearly define and break down the topic with technical accuracy.
Step 2: Historical Context - Place it within the broader timeline of technological evolution.
Step 3: Interdisciplinary Insights - Connect to philosophy, society, economy, ethics, and other domains.
Step 4: Regional Analysis - Highlight practical differences and impacts for India, USA, Southeast Asia, and Middle East.
Step 5: Future Outlook (2026-2030) - Develop grounded predictions, opportunities, and risks.
Step 6: Practical Value - Extract actionable advice and meaningful comparisons.
</thinking>

Using only the synthesized insights above, write the post.

Structure: Powerful engaging hook -> multiple <h2> sections -> bullet points and numbered lists -> at least one comparison table -> 7-8 thoughtful FAQs at the end.

Tone: Visionary, authoritative, accessible, and inspiring. Use fresh analogies.
Output ONLY clean HTML blog body content. Start directly with the hook paragraph. No explanations.`;

  return callGemini(prompt);
}

function generateNewsContent(newsItem) {
  const prompt = `You are a true modern polymath - a Renaissance-level thinker with profound expertise in physics, biology, computer science, philosophy of mind, economics, history of science, geopolitics, ethics, systems thinking, and long-term civilizational futurism.

Task: Transform this breaking science/technology news into a completely original, plagiarism-free, deeply insightful 950-1150 word SEO blog post.

News Title: ${newsItem.title}
News Summary: ${newsItem.description}
Source Link (for factual reference only - NEVER copy phrasing or structure): ${newsItem.link}

=== CHAIN-OF-THOUGHT REASONING PROTOCOL (Follow strictly) ===
<thinking>
Step 1: Scientific & Technical Core - Identify the fundamental breakthrough, mechanisms, and any limitations.
Step 2: Historical & Philosophical Context - Draw relevant historical parallels and deeper philosophical questions.
Step 3: Interdisciplinary Synthesis - Connect to at least 2-3 other fields with rigorous links.
Step 4: Regional & Global Impact - Analyze implications specifically for India, USA, Southeast Asia, and Middle East.
Step 5: Future Scenarios (2026-2035) - Develop 2-3 plausible scenarios with grounded predictions.
Step 6: Reader Value - Distill actionable insights and unique angles beyond typical news coverage.
</thinking>

Using ONLY the insights from the reasoning above, write the blog post.

Style: Authoritative yet accessible, inspiring, and subtly optimistic. Use fresh metaphors and avoid cliches.
Required Structure (HTML only):
- Start with a powerful hook.
- Multiple insightful <h2> sections.
- Bullet points or numbered lists.
- At least one meaningful comparison table.
- End with 7-8 thoughtful FAQs.

Output ONLY the clean HTML blog body content. Begin directly with the hook. No <thinking> tags or extra text.`;

  return callGemini(prompt);
}

function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 8192, topP: 0.95 }
  };

  try {
    const res = UrlFetchApp.fetch(url, { method: "POST", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      Logger.log("Gemini Error: " + res.getContentText().substring(0, 300));
      return "Content generation failed.";
    }
    const text = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
    return text || "Content generation failed.";
  } catch (e) {
    Logger.log("Gemini call failed: " + e.message);
    return "Content generation failed.";
  }
}

// =============================================
// TITLE GENERATION - now AI-generated and varied,
// instead of one fixed template string
// =============================================
function generateSEOTitle(keyword) {
  const recent = getRecentTitles();
  const avoidBlock = recent.length > 0
    ? `Avoid repeating the structure, opening words, or phrasing pattern of these recent titles:\n${recent.slice(-10).map(t => "- " + t).join("\n")}`
    : "";

  const prompt = `Write ONE SEO-friendly blog title for a post about: "${keyword}".

Requirements:
- Under 70 characters.
- Vary the format each time: sometimes a question, sometimes a "how to", sometimes a bold claim, sometimes a listicle-style number, sometimes a comparison. Do not always use the same structure.
- Sounds like it was written by a sharp human editor, not a template.
- No generic filler like "Ultimate Guide" unless it genuinely fits.
- Can include at most one relevant emoji at the start, or none at all - vary this too.
${avoidBlock}

Output ONLY the title text. No quotes, no explanation.`;

  const result = callGemini(prompt);
  if (!result || result === "Content generation failed.") {
    // fallback so a post never fails outright
    return `${keyword} - What you need to know in 2026`;
  }
  return result.trim().replace(/^["']|["']$/g, "");
}

function generateSEOTitleForNews(newsTitle) {
  const recent = getRecentTitles();
  const avoidBlock = recent.length > 0
    ? `Avoid repeating the structure or phrasing pattern of these recent titles:\n${recent.slice(-10).map(t => "- " + t).join("\n")}`
    : "";

  const prompt = `Write ONE SEO-friendly blog title analyzing this news story: "${newsTitle}".

Requirements:
- Under 80 characters.
- Vary the format each time (question, bold claim, "what it means for X", direct statement). Don't reuse the same pattern every time.
- Sounds human-written, specific to this story - not a generic label slapped on top.
${avoidBlock}

Output ONLY the title text. No quotes, no explanation.`;

  const result = callGemini(prompt);
  if (!result || result === "Content generation failed.") {
    const clean = newsTitle.length > 85 ? newsTitle.substring(0, 82) + "..." : newsTitle;
    return `${clean} - What it means`;
  }
  return result.trim().replace(/^["']|["']$/g, "");
}

// =============================================
// IMAGE SELECTION - multiple candidates, random
// pick, dedup against recent history, alternates
// between Unsplash and Pexels
// =============================================
function fetchVariedImage(searchQuery) {
  const recentIds = getRecentImageIds();
  const useUnsplash = Math.random() < 0.6; // weight toward Unsplash, still mixes in Pexels

  let img = useUnsplash ? fetchFromUnsplash(searchQuery, recentIds) : fetchFromPexels(searchQuery, recentIds);

  // fall back to the other source if first choice found nothing new
  if (!img) {
    img = useUnsplash ? fetchFromPexels(searchQuery, recentIds) : fetchFromUnsplash(searchQuery, recentIds);
  }

  if (img) saveRecentImageId(img.id);
  return img;
}

function fetchFromUnsplash(searchQuery, recentIds) {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10&client_id=${UNSPLASH_ACCESS_KEY}`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const data = JSON.parse(res.getContentText());
    if (!data.results || data.results.length === 0) return null;

    const fresh = data.results.filter(p => !recentIds.includes("u_" + p.id));
    const pool = fresh.length > 0 ? fresh : data.results;
    const p = pool[Math.floor(Math.random() * pool.length)];

    return {
      id: "u_" + p.id,
      image: p.urls.regular,
      author: p.user.name,
      profile: p.user.links.html,
      alt: p.alt_description || searchQuery,
      source: "Unsplash"
    };
  } catch (e) {
    Logger.log("Unsplash failed for: " + searchQuery);
    return null;
  }
}

function fetchFromPexels(searchQuery, recentIds) {
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=10`;
    const res = UrlFetchApp.fetch(url, { headers: { Authorization: PEXELS_API_KEY }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;

    const data = JSON.parse(res.getContentText());
    if (!data.photos || data.photos.length === 0) return null;

    const fresh = data.photos.filter(p => !recentIds.includes("p_" + p.id));
    const pool = fresh.length > 0 ? fresh : data.photos;
    const p = pool[Math.floor(Math.random() * pool.length)];

    return {
      id: "p_" + p.id,
      image: p.src.large,
      author: p.photographer,
      profile: p.photographer_url,
      alt: p.alt || searchQuery,
      source: "Pexels"
    };
  } catch (e) {
    Logger.log("Pexels failed for: " + searchQuery);
    return null;
  }
}

function buildImageHTML(img) {
  return `<div style="margin-bottom:32px;">
    <img src="${img.image}" alt="${img.alt}" style="width:100%;border-radius:12px;"/>
    <p style="text-align:center;font-size:13px;color:#666;">Photo by ${img.author} on ${img.source}</p>
  </div>`;
}

function buildFullHTML(title, imageHTML, content, hindi, arabic) {
  return `<div style="max-width:820px;margin:auto;padding:20px;font-family:Georgia,serif;line-height:1.8;">
    ${imageHTML}
    <div>${content}</div>
    <div style="margin:50px 0;background:#f8f9fa;padding:25px;border-radius:12px;">
      <h2>Read in Hindi</h2><p>${hindi}</p>
    </div>
    <div style="margin:30px 0;background:#f8f9fa;padding:25px;border-radius:12px;direction:rtl;text-align:right;">
      <h2>اقرأ بالعربية</h2><p>${arabic}</p>
    </div>
  </div>`;
}

// Translations
function translateToHindi(text) { return translateText(text, "hi"); }
function translateToArabic(text) { return translateText(text, "ar"); }
function translateText(text, lang) {
  try {
    const clean = text.replace(/<[^>]*>/g, "").substring(0, 500) + "...";
    return LanguageApp.translate(clean, "en", lang);
  } catch (e) { return "Summary not available."; }
}

// =============================================
// BLOGGER
// =============================================
function postToBlogger(title, content) {
  const token = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts?isDraft=false`;
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "POST",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ title, content }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
    Logger.log("Blogger Error: " + res.getContentText());
    return null;
  } catch (e) {
    Logger.log("Blogger failed: " + e.message);
    return null;
  }
}

// =============================================
// FACEBOOK
// =============================================
function postToFacebook(title, url, imageUrl) {
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_ACCESS_TOKEN) {
    Logger.log("Facebook skipped - credentials not configured in Script Properties");
    return;
  }
  try {
    const message = `New post: ${title}\n\nFull guide + Web Story:\n${url}`;

    let fbUrl, payload;
    if (imageUrl) {
      fbUrl = `https://graph.facebook.com/v20.0/${FACEBOOK_PAGE_ID}/photos`;
      payload = { url: imageUrl, message: message };
    } else {
      fbUrl = `https://graph.facebook.com/v20.0/${FACEBOOK_PAGE_ID}/feed`;
      payload = { message: message, link: url };
    }

    const response = UrlFetchApp.fetch(fbUrl, {
      method: "POST",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${FACEBOOK_ACCESS_TOKEN}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      Logger.log("Posted to Facebook Successfully");
    } else {
      Logger.log(`Facebook API Error (Status ${response.getResponseCode()}): ${response.getContentText()}`);
    }
  } catch (e) {
    Logger.log("Facebook Script Error: " + e.message);
  }
}

// =============================================
// GOOGLE WEB STORIES
// =============================================
function createAndPostWebStory(topic, title, mainImg) {
  const slides = generateWebStorySlides(topic);
  const html = buildWebStoryHTML(topic, title, slides);
  const result = postToBlogger(`Web Story: ${title}`, html);

  if (result) {
    Logger.log("Web Story Published: " + result.url);
    postToFacebook(`Web Story: ${title}`, result.url, mainImg ? mainImg.image : null);
  }
}

function generateWebStorySlides(topic) {
  const prompt = `Create 6 engaging Google Web Story slides for "${topic}". Each slide needs a distinct angle (don't repeat the same idea reworded). Return ONLY a valid JSON array of objects, each with keys: title, text, imageQuery. Make each imageQuery specific and different from the others - avoid generic repeated terms like "futuristic" on every slide.`;
  let text = callGemini(prompt);
  if (!text) return getFallbackSlides(topic);
  try {
    text = text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    return getFallbackSlides(topic);
  }
}

function getFallbackSlides(topic) {
  return [
    {title: `${topic.substring(0, 60)}`, text: "Major breakthrough explained", imageQuery: topic + " overview"},
    {title: "Why it matters", text: "Impact across India, USA, SEA & Middle East", imageQuery: topic + " impact"},
    {title: "Deep insights", text: "Expert analysis", imageQuery: topic + " analysis"},
    {title: "Key takeaways", text: "What you should know", imageQuery: topic + " explained"},
    {title: "2026 outlook", text: "Long-term vision", imageQuery: topic + " future"},
    {title: "Next steps", text: "Actionable advice", imageQuery: topic + " getting started"}
  ];
}

function buildWebStoryHTML(topic, title, slides) {
  let pages = "";
  const recentIds = getRecentImageIds();
  const cover = fetchVariedImage(topic + " overview");
  if (cover) {
    pages += `<amp-story-page id="cover"><amp-story-grid-layer template="fill"><amp-img src="${cover.image}" layout="fill"></amp-img></amp-story-grid-layer><amp-story-grid-layer template="vertical" class="center"><h1 style="color:white;text-shadow:0 2px 15px rgba(0,0,0,0.8);">${title}</h1></amp-story-grid-layer></amp-story-page>`;
  }

  slides.forEach((s, i) => {
    const img = fetchVariedImage(s.imageQuery);
    if (img) {
      pages += `<amp-story-page id="p${i}"><amp-story-grid-layer template="fill"><amp-img src="${img.image}" layout="fill"></amp-img></amp-story-grid-layer><amp-story-grid-layer template="vertical" class="center"><div style="background:rgba(0,0,0,0.65);padding:25px;color:white;border-radius:12px;margin:15px;"><h2>${s.title}</h2><p>${s.text}</p></div></amp-story-grid-layer></amp-story-page>`;
    }
  });

  return `<!doctype html><html amp lang="en"><head><meta charset="utf-8"><script async src="https://cdn.ampproject.org/v0.js"></script><script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script><style>amp-story-grid-layer.center {align-items:center;justify-content:center;}</style></head><body><amp-story standalone title="${title}" publisher="AI &amp; Science Insights">${pages}</amp-story></body></html>`;
}
