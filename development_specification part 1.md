# Overall goal:
* Develope a turn based RPG Card 1 vs 1 combat game which is a web frontend only web app, which allows 1 device mode or 2 device mode (2 device mode means 2 players can use 2 independent edge devices to play together). Provide engaging, dynamic and interactive experiences.

# Overall app workflow:
* First step: Let user choose between 1 device mode and 2 device mode. 
* Second step: start the game. If 1 device mode is chosen, assume 2 players play on the same device. If 2 device mode is chosen, create a mechanism to invite a second player to join the game. For example create a link to this game session so that player 1 can share with player 2 to click on and join the game session using a peer to Peer architecture. For example you can use the PeerJS method. Note that the game later will be hosted on github pages. The link of the app is https://luckycat365.github.io/mygame1/

# Game mechanism:
* Turn based game. It looks like this: Player 1 active turn -> Player 2 defensive turn -> Result calculation phase -> Player 2 active turn -> Player 1 defensive turn -> Result calculation -> repeat.
* The game begins with player 1’s active turn, he should click on a button to roll the dice. The possible numbers of the dice are integer numbers from 1 to 10. The result is the attacking points. Mark that offensive number. After player 1 rolled the attacking dice, it follows the player 2 defensive turn: player 2 rolls the dice also with possible numbers from 1 to 10. Mark that defensive number. Result calculation phase: The damage player 1 causes is the “player 1 offensive dice number” – “player 2 defensive dice number”. If the result is negative, set it to zero. This means the attack has been blocked. Substract player 2’s health with this damage calculation result. Then it goes to player 2’s active turn and the same mechanism repeats.
* Each character starts at the beginning with max health number 100. 
* End of game: The player whose character’s health falls to zero loses.
# Game Visual:
* Use the “character 1.webp” and “character 2.jpeg” in the assets folder as card to represent the characters. Make sure they will appear with same size in the game.
* When it comes to the turn of player 1, highlight the card of player 1 in the game. When it comes to the turn of player 2, highlight the card of player 2 in the game.
* The button to roll the dice should be represented by the image "dice.png".
* After clicking on the dice button, generate a random sequence of numbers between 1 and 10 for 1.1 seconds, display it on the screen, the last number is the result. When doing this, play the sound "dice.wav".
* In the Result calculation phase where a player causes damage to another player, smash the character card of the attacking player onto the character card of the defending player to animate the attack. Accompanied by a smashing sound.
* When the character 1 causes a successful damage to another character, use the character1_basicattack.png as the attack animation.
* When the character 2 causes a successful damage to another character, use the character2_basicattack.png as the attack animation.
* The character who is hit and takes the damage should shake when damage is caused by the opponent.
* Use the "background2.webp" as the background picture of the game.
