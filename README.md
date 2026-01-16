# RPG Card Combat

A turn-based 1v1 card combat game running in the browser.

## Features
- **1 Player Mode**: Play locally on one device (Hotseat).
- **2 Player Mode**: Play online using PeerJS (P2P).
- **Visuals**: Animations, Health Bars, Dice Rolling.

## How to Play
1. **Choose Mode**: Select "1 Device" or "2 Devices".
2. **Online Mode**:
   - Host: Select "2 Devices". A link will be generated. Send this link to your friend.
   - Guest: Open the link to join automatically.
3. **Gameplay**:
   - **Player 1 Attack**: P1 rolls dice (Attack).
   - **Player 2 Defend**: P2 rolls dice (Defense).
   - **Resolve**: Damage = Attack - Defense. If Damage > 0, P1 smashes P2!
   - **Player 2 Attack**: Roles reverse.
   - Game ends when one player reaches 0 Health.

## Development
1. Install dependencies: `npm install`
2. Run locally: `npm run dev`
3. Build for production: `npm run build`

## Credits
- Built with Vite & Vanilla JS.
- PeerJS for networking.
- Fonts: Orbitron, Roboto.

## Deployment (GitHub Pages)

To deploy this game to GitHub Pages:
1. Run `npm run build`. This generates the `docs` folder.
2. Push the entire repository to GitHub.
3. In your GitHub Repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment**, set **Source** to "Deploy from a branch".
   - Select your main branch and then select the **/docs** folder from the dropdown.
   - Click **Save**.

