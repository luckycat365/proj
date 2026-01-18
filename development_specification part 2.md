# Game mechanism extension:
## Characters
* Now each character has 2 sets of attributes: Meta Information and basic attributes. Meta Information includes:姓名 (Name), 职业 (Profession),画像 (Image， this is the image file name of the character),特殊技1 (Special Skill 1),特殊技2 (Special Skill 2),特殊技3 (Special Skill 3). Basic attributes are: 血 (Health), 功 (Attack), 防 (Defense), 法 (Magic). Create these attributes using the specified chinese characters only, don't take the English explaination. Do this by creating character class. 
* The current character1 and character2 are objects of the character class. Character 1: Meta info: 姓名=黄凌侯, 职业=仙修,画像=character1.webp,特殊技1=噬魂,特殊技2:empty for now,特殊技3:empty for now. Basic attributes are: 血=100, 功=4, 防=1, 法=10. Character 2: Meta info: 姓名=文亮, 职业=剑修,画像=character2.webp,特殊技1=万剑决,特殊技2 empty for now,特殊技3:empty for now. Basic attributes are: 血=105, 功=2, 防=3, 法=5. 
## 特殊技(Special skills)
* Each character has 1 to 3 special skills. Each skill has the following attributes: 特殊技名(name), 描述(description), 功能(function),功能数值(function_value), 特效图(this is the image file name of the skill effect). These skills will be used by the characters. 功能(function) and 功能数值(function_value) needs to be used in combination. For 功能(function), only 2 options are allowed: 攻击 (Attack); 防御 (Defense); If 功能(function) is 攻击 (Attack), then 功能数值(function_value) is the attack value. If 功能(function) is 防御 (Defense), then 功能数值(function_value) is the defense value.
* Now there are 2 special skills: 
    * 特殊技名=万剑决, 功能=攻击, 功能数值=6, 特效图=万剑决.png. 
    * 特殊技名=噬魂, 功能=攻击, 功能数值=6, 特效图=噬魂.png. 
## Combat mechanism extension
* The calculation phase is extended like this: result = (dice roll + 功 of the attacker attributes) - (defensive dice roll + 防 of the defender attributes).
* The special skills are currently not considered in the attack and defense calculation. Will be specified later.
* Show the complete formula of the calculation of this in the current middle block where the dice rool is displayed.