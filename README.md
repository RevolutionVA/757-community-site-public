# v1 of the 757tech website
## About this repo & website
- This is where we're building out the future home of 757tech
- It's meant to be an accessible, collaborative, community-run site that celebrates and points to all tech-related events and resources being offered in the Hampton Roads (Virginia, USA)
- It's being built with [Astro](https://astro.build/blog/astro-4110/) and [AstroWind](https://github.com/onwidget/astrowind)
- For now, updates are only being made on this branch and new contributors should be submitting feature and bug fix PRs from subbranches off of v1

## Pages & content
### "Home" page
This should be a general introduction to the brand/org, celebrate our region, people, and industries, offer up a call to action to get involved, as well as point to the other pages of the site

### "Groups" page
This should highlight and provide links to all the different groups that support online or in-person events or communities. This list is growing and evolving, but ultimately it would be nice if these were all seperate, searchable, filterable cards on this 
page that have clear, concise intros, labels, supporting platform (Meetup.com, LinkedIn, Slack, etc.), and a call to action (link to their group, Slack, etc. page).

#### Potential group list
- 757dev
- 757 Makerspace
- Norfolk.js
- 757 ColorCoded
- The Digital Builders 757
- Gay in Tech
- Hampton Roads .NET 
- Interaction Design Association (IxDA) Hampton Roads
- 757 Build Weekend
- Geeks at a Bar
- Hampton Roads Cyber Security for Control Systems
- Mid Atlantic Tech Bridge (MATB)
- Late Night Coders
- Crypto Over Coffee
- Hampton Roads SQL Server
- Platform Engineering & DevOps - Hampton Roads
- Information Systems Security Association (ISSA) Hampton Roads

#### Potential labels
- AI/ML/LLM
- IoT
- Robotics
- 3D Printing
- Blockchain
- Cybersecurity
- VR/AR
- Cloud Computing
- Big Data
- Quantum Computing
- Embedded Systems
- Open Source Projects
- Software Development
- Game Development
- Beginnger-friendly
- Free
- In-person
- Online

### "About" page
This page would dive a bit deeper into what makes our community great, some history around the region, our sponsors, and the board/chairs pushing this umbrella org forward. More info coming on this soon.

### "Get involved" page
This page would highlight how folks could get involved and who they should contact if they're interested

## Brand & style guidelines
For the time being we're keeping things as general as possible so please don't venture off the path that AstroWind has set from a branding, color, font, imagery, and CSS perspective. To learn more about the CSS framework that AstroWind is built on top of, please scroll to the bottom of the page and read through the "Helpful links" sections. Future improvements to this will be talked about and settled at a later date, but until then lets focus on the bones and content of the site first. 

## Get involved
With this being a community-run project, we are absolutely looking for artists, writers, developers, etc. to get involved. If you're wanting to roll up your sleeves and start building or just want to pass along some suggestions, reach out to [Ted Patterson](https://www.linkedin.com/in/tedjpatterson) to ask further questions and get access.

### For developer contributors
This overview and checklist provide a structured approach for developer contributors to efficiently contribute to the 757tech website project on GitHub.

#### Before starting
1. Fork the repository to your GitHub account
2. Clone the forked repository to your local machine:
   ```
   git clone https://github.com/your-username/website.git
   ```
3. Install ASTRO and necessary dependencies:
   ```
   npm install
   ```

#### Development process
1. Create a branch off of v1
   Create a new branch for your feature or bug fix:
   ```
   git checkout -b v1/feature/my-feature
   ```
   ```
   git checkout -b v1/bug/my-fix
   ```
2. Make necessary changes to the website pages or styles using ASTRO
3. Commit changes to your branch
   ```
   git add .
   git commit -m "Brief description of your changes"
   ```
4. Push your changes to your GitHub repository
   ```
   git push origin v1/feature/my-feature
   ```
   ```
   git push origin v1/bug/my-fix
   ```
5. Go to your forked repository on GitHub and submit a pull request, with a clear description of the changes you made, to the v1 branch of the repo.
   
#### After submission
1. Participate in the code review process as needed
2. Make changes and push them to your branch. The pull request will update automatically
3. Once approved, your pull request will be merged into the v1 branch of the repository
   
### Helpful links
- GitHub tutorials
  - [Creating an Issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-issues)
  - [Requesting Repository Access](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/access-permissions-on-github/requesting-organization-approval-for-a-repository)
  - [Contributing to Open Source on GitHub](https://docs.github.com/en/get-started/quickstart/contributing-to-projects)
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [ASTRO library documentation](https://astro.build/)
- AstroWind theme
  - [Github repo & documentation](https://github.com/onwidget/astrowind)
  - [Site demo](https://astrowind.vercel.app/)
- Tailwind
  - [Documentation](https://tailwindcss.com/docs/installation)
  - [Component examples](https://tailwindflex.com/)
