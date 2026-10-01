# Lens Finder

I need a webapp that will just be hosted on a shared network drive and reference a spreadsheet on the same drive. We are an optical office. I am building a database of stock lenses we can order in an excel book, with a list of materials and features. I have an idea of how I want the app to function, but the basic idea is that an optician will input the lens options and the app will look in the excel book and provide a list of exact matches with their prices, as well as any close matches. The design should be pretty clean and simple. I can upload the excel book.  There should be a checkmark or something to select if the lens is for a VSP order, there will be a few things in the rest of the form that should change depending on this choice, and the app should only search the sheet labeled Plexus. If it is not checked, the app should search both sheets, labeled Plexus and OOGP. There should be a dropdown to select material, which is the primary parameter. Then an option to select Aspheric, Spheric, or No preference. If VSP is checked, then don't include this option, we'll assume no preference. Next there should be a selection for AR, or Anti-reflective coating. If VSP is checked, only one drop-down is needed, with a list of AR coatings that are marked in the AR sheet as TRUE for VSP.  If VSP is not checked, then there should be two drop downs. The first one should start with the options "No AR", "Any Tier", and "Any Blue AR", followed by a list of all the available Tiers. If "No AR" is selected, then the second dropdown will be grayed out or unavailable or invisible. Otherwise, the second dropdown will contain a list of AR that fit the category, but default to "Any AR in Category". The rest of the form should be the same regardless of if VSP is checked. Then there should be a box to enter the Sphere and Cylinder for the Rx, they are optional. Even though Cyl says Max, it's actually a lower bound, with 0 as the upper bound. When searching lenses, the Sphere and Cylinder added together should not exceed "Total Power Lower Bound". Other addable options are Blue Filter Lens (This is based on the option on the actual lens, not in the AR), Photochromic (the option is binary, but the search will show the type and color if relevant), and Tint.  The search should prioritize any lenses that are an exact match, but also show any options that are close. I can upload the excel book.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/41008002-d0c8-40d4-8d3b-1cad64fba9e8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
