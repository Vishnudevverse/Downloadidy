# Help & Documentation - Downloadidy

Welcome to the Help guide for Downloadidy. Below is an overview of the core features and how to leverage them.

## UI Breakdown

- **Master Toggle**: The main switch to turn the entire extension on or off.
- **This Site Toggle**: Temporarily disable all rules for the current website.
- **Open Downloads Button**: A quick shortcut to your browser's downloads page.
- **Save Button**: Saves your current rule configuration. It will blink if you have unsaved changes.
- **Next Download Name**: A one-time override for the name of the very next file you download.
- **Path Preview**: Shows a live example of how your downloads will be structured based on your current rules.
- **Global / Site-Specific Toggle**: Switch between editing rules for all websites (Global) or just the current one.
- **Rule List**: The draggable list of rules that determines the folder hierarchy.

## The Rule System

Downloadidy relies on a hierarchical folder system, allowing you to stack conditions to build a smart directory structure. 

### Core Rules
- **By Domain**: Creates a folder named after the website you are downloading from.
- **By File Type**: Checks the file extension and maps it to a human-readable folder (e.g., `PNG Image`).
- **By Date**: Groups the downloads by the month/year (`2026-Mar`).
- **By Keyword**: If the raw filename contains a user-defined word, it places the file in a mapped folder.
- **Custom Path**: Appends a custom directory structure (like `Work/Projects/`) to your path tree.

### Drag and Drop
At the bottom of your extension panel, you will see a list of these rules. By dragging the options up or down, you instruct Downloadidy exactly how the tree should flow. \
*Example Order: [Date] -> [Domain]* = `2026-Mar/github/file.zip`.

## Global Mode vs Site Mode

Downloadidy allows you to configure rules that apply **everywhere** (Global), or that apply **only to a dedicated website** (Site-Specific).

- To customize how a specific website is handled, go to that website, click the Downloadidy extension, uncheck the "Global" toggle, and adjust your rules.
- You can essentially use Site Mode to completely bypass all rules for a single site and direct everything from there to a hard-coded custom folder.

## Keyword Management

You can establish powerful mapping triggers to keep chaotic filenames at bay.
1. Scroll to **Keyword Rules** in the popup.
2. Click **+ Add Keyword Rule**.
3. Specify the Keyword you expect (like *invoice*) and the folder it should trigger (*Finance/Invoices*).

## Troubleshooting

- **Problem: My downloads are still asking me where to save.**
  - **Solution:** You must disable "Ask where to save each file before downloading" in your browser's settings. Downloadidy cannot override this browser-level setting.

- **Problem: A file from a specific site didn't get sorted correctly.**
  - **Solution:** Check if you have site-specific rules enabled for that domain. The rules for that site might be different from your global settings.

- **Problem: The popup seems stuck or isn't saving.**
  - **Solution:** Try closing and reopening the popup. If the issue persists, you can try reinstalling the extension.

## Contact / Support

If you run into missing file extensions, issues parsing domains, or anything unexpected, please visit our repository and submit an Issue. Ensure you include the URL, the file type, and your current Rule Hierarchy settings.
