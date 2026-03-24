# FAQ - DownPort

**Q: Do I need to manually confirm every download?**
No! For DownPort to work its magic automatically in the background, you should go into your browser settings and disable the option that says *"Ask where to save each file before downloading"*. By doing this, DownPort intercepts the download and auto-routes it instantly.

**Q: Why did my file go to the "Other" folder?**
If a file goes to the "Other" folder, it means the extension was completely unable to figure out what domain you were browsing when the file was downloaded. This is rare, but usually happens for deeply embedded system-level links. (Note: Blob/Data downloads from AI sites like ChatGPT or Gemini are fully supported and will not fall into "Other"!).

**Q: In what order do the rules execute?**
You control the hierarchy! When you open the extension popup, you can physically arrange the rules by dragging the `☰` icon to reorder them. 
For example, if the order is `By Domain` -> `By File Type`, a PDF from Google will go to `google/PDF Document/file.pdf`. 

**Q: What happens if a filename matches multiple Keyword Rules?**
The first rule in the list that matches will be used. Keyword rules are evaluated from top to bottom as they appear in your list.

**Q: How can I customize the folder name for a domain (e.g., use "google-images" instead of "google")?**
When you are on the site you want to customize (e.g., google.com), open the popup. Under the "Folder Name" section, uncheck "Use Default Folder Name". You can then select parts of the domain or type in your own custom segments to build a unique folder name for that site.

**Q: I set a Keyword Rule, but my file ignored it. Why?**
Keyword rules are evaluated based on your hierarchy. Ensure your Keyword Rule is enabled. Additionally, make sure the string in the file actually matches the keyword you provided (the matching is case-insensitive).

**Q: What is a One-Time Download Name?**
Sometimes you want to give a highly specific name to the one file you're about to download, without changing your global settings. Simply click the extension icon, type a name in the "Next Download Name (One-time)" box, and download your file. The extension applies the name to that single file and then clears the box.

**Q: Does this extension impact browser performance?**
No. The extension is lightweight and only runs for a brief moment when a download is initiated. It does not run continuously in the background or monitor your browsing activity, so its performance impact is negligible.

**Q: Why doesn't DownPort work in Incognito / InPrivate mode?**
By default, browsers do not allow extensions to run in private windows. If you want DownPort to organize files downloaded in Incognito, you must explicitly go to your browser's Manage Extensions page, find DownPort, and check "Allow in Incognito/InPrivate".
