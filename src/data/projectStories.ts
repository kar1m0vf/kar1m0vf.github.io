import type { ProjectStory, ProjectTheme } from '../types';

// Visitor stories explain the experience; technical notes live in projectBuilds.
export const projectStories: Record<ProjectTheme, ProjectStory> = {
  nar: {
    flow: ['Browse', 'Find', 'Choose', 'Save', 'Return'],
    overview:
      'Choosing a dessert should be enjoyable, even when you do not know its name. Nar Patisserie is a storefront demo that helps someone find a cake, understand what is in it, and keep their choices for later.',
    decision:
      'Leave, come back, and keep choosing. A shopping break should not mean starting over.',
    chapters: [
      {
        label: 'Find your favourite',
        title: 'Start with a taste, not a product name.',
        detail:
          'Someone looking for a particular ingredient can search for it directly, then narrow the collection by category. Price sorting and a favourites view help turn a long catalog into a manageable shortlist.',
        points: [
          'Look for flavours or ingredients you already enjoy.',
          'Compare prices without losing your current search.',
          'Save interesting desserts while you keep browsing.',
        ],
      },
      {
        label: 'Choose with confidence',
        title: 'Know what you are adding.',
        detail:
          'Each dessert has a page with its taste, ingredients, listed allergens, size or format, and price. The quantity controls and cart summary make the selection easier to review before continuing.',
        points: [
          'Read the product information before making a choice.',
          'Adjust quantities and see the updated total.',
          'Explore a small selection of other desserts.',
        ],
      },
      {
        label: 'Pick up where you left off',
        title: 'Your shortlist stays with you.',
        detail:
          'Favourites and cart quantities remain in the same browser when you move between pages or return later. Customers can take their time, revisit a dessert, and continue with their earlier choices.',
        points: [
          'Return to the desserts you saved.',
          'Keep your cart after refreshing the page.',
          'Remove items or clear the selection whenever you want.',
        ],
      },
    ],
    scope:
      'This is a storefront demo. Checkout shows a confirmation and clears the cart; it does not place a real order, take payment, or arrange delivery.',
    contribution:
      'I built the storefront pages, connected browsing with product details and the cart, and made saved choices available when someone returns.',
  },
  trendyol: {
    flow: ['Add', 'Set', 'Wait', 'Check', 'Decide'],
    overview:
      'Checking several product pages every day gets repetitive. This independent Telegram bot follows Trendyol prices for you, keeps a record of changes, and lets you choose which updates deserve your attention.',
    decision:
      'A price update should help you make a decision, without taking over your day.',
    chapters: [
      {
        label: 'Less checking',
        title: 'Give the watchlist the repetitive work.',
        detail:
          'Send a product link to the bot and add it to your watchlist. A compact list keeps your tracked products together, with a product card for checking its price and changing your preferences.',
        points: [
          'Follow several products from one Telegram conversation.',
          'Open a product card when you need more information.',
          'Pause tracking and resume it without losing earlier history.',
        ],
      },
      {
        label: 'Useful notifications',
        title: 'Hear about changes that matter to you.',
        detail:
          'You can wait for a target price, a price range, or a particular drop instead of treating every change as news. Quiet hours and grouped updates help keep notifications from becoming another distraction.',
        points: [
          'Choose an alert rule for each product.',
          'Set quiet hours around your routine.',
          'Change your preferences as your plans change.',
        ],
      },
      {
        label: 'A clearer decision',
        title: 'See the change, not just today’s number.',
        detail:
          'Price history charts show how a product has changed over time. Comparisons and downloadable records give you more context when deciding whether to buy, while your account controls let you remove your stored data.',
        points: [
          'Review the history before deciding whether to buy.',
          'Compare products and download your records.',
          'Use Russian, English, Azerbaijani, or Turkish.',
        ],
      },
    ],
    scope:
      'The live service runs in Telegram. The price check on this portfolio uses illustrative prices to demonstrate the alert rules; it is not a live product lookup.',
    contribution:
      'I built the tracking service, watchlists, price history, notification controls, and the tools needed to keep the bot running over time.',
  },
  blaster: {
    flow: ['Choose', 'Play', 'Dodge', 'Learn', 'Retry'],
    overview:
      'Blaster is a desktop arcade shooter for a quick challenge and another attempt. Choose a ship, work through enemy waves, and use the feedback from each fight to improve your next run. A shorter browser version lets you try the idea here.',
    decision:
      'Make the next attempt inviting: clear feedback, a quick retry, and room to improve.',
    chapters: [
      {
        label: 'Your kind of run',
        title: 'Choose how you want to play.',
        detail:
          'The desktop game offers three ships with different weapons, from twin shots to plasma and a rail weapon. Difficulty, visual quality, and sound settings let you adjust the experience to your preference and computer.',
        points: [
          'Try another ship for a different style of combat.',
          'Adjust difficulty and the amount of visual effects.',
          'Pause the game when you need a break.',
        ],
      },
      {
        label: 'A fight you can read',
        title: 'React, adapt, and keep going.',
        detail:
          'Enemy waves lead into boss fights with changing attacks. Warning cues help you read what is coming, while shields and weapon powerups give you chances to recover or push ahead.',
        points: [
          'Watch for warning signs before an attack.',
          'Use shields and powerups as the fight develops.',
          'A brief grace period after a hit gives you time to react.',
        ],
      },
      {
        label: 'One more attempt',
        title: 'Take something from every run.',
        detail:
          'A short, skippable replay shows the final moments after a defeat. Saved highscores give you a result to beat, and your chosen settings remain ready for the next time you open the game.',
        points: [
          'Review the five-second replay or go straight to retrying.',
          'Come back to your saved scores and preferences.',
          'Challenge yourself through an eight-wave offline operation.',
        ],
      },
    ],
    scope:
      'These features describe the original desktop game. The game on this page is a separate, shorter browser adaptation with fewer features. Saved scores and settings do not save your progress within a run.',
    contribution:
      'I built the gameplay, menus, combat feedback, saved scores and settings, and the Windows release package, then made a small browser adaptation for this portfolio.',
  },
};
