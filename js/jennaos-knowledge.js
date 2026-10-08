/* JennaOS knowledge: everything the chat can say.
 *
 * Add to it by appending an entry. Each entry is one topic, written in the
 * first person, in Jenna's voice. Fields:
 *
 *   id         unique slug
 *   title      short topic name (matched strongly)
 *   tags       words people might use for this topic (matched strongly)
 *   questions  example questions that should land here (matched well)
 *   anchors    optional words that, when someone names them outright, pick this
 *              entry over any generic match (a project name, "Maeve")
 *   text       the answer. Short paragraphs; "\n\n" starts a new one.
 *   links      optional [{ label, href }] shown under the answer
 *   app        optional pill id to offer ("maeve", "fashion", "start")
 *
 * Sources so far: llms.txt, the homepage About section, and the four public
 * case-study summaries. Nothing here comes from the password-protected case
 * studies. If it isn't on the public site, it doesn't belong in this file
 * unless Jenna wrote it for this purpose.
 */
window.JennaOSKnowledge = [
  {
    id: 'hello',
    title: 'Hello',
    tags: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'sup'],
    questions: ['hi', 'hello there', 'hey jenna'],
    text: 'Hi, I’m JennaOS. Ask me about my work, how I think about design, or what I’m into when I’m away from the screen.'
  },
  {
    id: 'who',
    title: 'Who is Jenna',
    tags: ['who', 'jenna', 'ammerall', 'about', 'introduce', 'yourself', 'bio', 'background', 'designer', 'engineer', 'seattle', 'location', 'based'],
    questions: ['who are you', 'where do you live', 'are you a designer or an engineer', 'tell me about yourself', 'what do you do', 'where are you based', 'what is your job'],
    text: 'I’m a product and interaction designer based in Seattle. Over the past nine years, I’ve worked at Microsoft and Meta across collaboration, social products, accessibility, and the systems that hold those experiences together.\n\nMy work moves between early product ideas and established products used at scale.'
  },
  {
    id: 'design-thinking',
    title: 'How I think about design',
    tags: ['design', 'thinking', 'philosophy', 'approach', 'process', 'principles', 'seams', 'patterns', 'systems', 'behavior', 'craft', 'strategy', 'framework', 'frameworks', 'values'],
    questions: ['how do you think about design', 'what is your design philosophy', 'what is your approach', 'how do you work', 'what are the seams', 'what makes your work different', 'what is your superpower', 'what do you care about'],
    text: 'I care about how things fit together, balancing product behavior and visual craft.\n\nI’m drawn to the seams: finding the shared behaviors and patterns that help experiences fit together, while preserving the bespoke details that give each product its character.\n\nI get to the root of the problem, define the behaviors, and build the frameworks teams need to carry those decisions across products, so everything moves as one.',
    links: [{ label: 'Selected work', href: 'index.html#work-section' }]
  },
  {
    id: 'focus',
    title: 'Focus areas',
    tags: ['focus', 'skills', 'strengths', 'expertise', 'specialty', 'specialties', 'interaction', 'cross-product'],
    questions: ['what are your strengths', 'what are you good at', 'what are your focus areas', 'what skills do you have'],
    text: 'Interaction design, product behavior, product strategy, visual craft, and cross-product experience.'
  },
  {
    id: 'toolkit',
    title: 'Design toolkit',
    tags: ['tools', 'toolkit', 'tool', 'figma', 'react', 'github', 'claude', 'code', 'prototype', 'prototyping', 'research', 'testing', 'usability', 'metrics', 'experimentation', 'stack'],
    questions: ['what tools do you use', 'do you code', 'what is your toolkit', 'do you do research', 'do you prototype'],
    text: 'Design and build: Figma and Figma Make, Claude and Claude Code, React, GitHub.\n\nProblem framing: briefs, audits, gap analysis, requirements.\n\nResearch and validation: qualitative research, usability testing, experimentation, product metrics.\n\nDelivery and scale: scenario prototypes, tradeoffs, workback plans, design QA, frameworks, reusable patterns.'
  },
  {
    id: 'experience',
    title: 'Experience and career',
    tags: ['experience', 'career', 'resume', 'cv', 'history', 'jobs', 'work', 'worked', 'companies', 'meta', 'microsoft', 'facebook', 'senior', 'years', 'employer', 'employers', 'role', 'title'],
    questions: ['where have you worked', 'where did you work', 'where do you work', 'what is your experience', 'what companies have you worked for', 'what is your title', 'how long have you been designing'],
    text: 'Senior Product Designer at Meta, 2022 to 2026. Product Designer at Microsoft, 2017 to 2022. Nine years in all, across collaboration, social products, and accessibility.',
    links: [{ label: 'About me', href: 'index.html#about' }]
  },
  {
    id: 'education',
    anchors: ['rit', 'rochester'],
    title: 'Education',
    tags: ['education', 'school', 'college', 'university', 'degree', 'rit', 'rochester', 'bfa', 'studied', 'graduate', 'new media'],
    questions: ['where did you go to school', 'what did you study', 'what is your degree'],
    text: 'I have a BFA in New Media Design from the Rochester Institute of Technology.'
  },
  {
    id: 'patent',
    anchors: ['patent'],
    title: 'Patent',
    tags: ['patent', 'patents', 'inventor', 'invented', 'fluid', 'framework', 'ip'],
    questions: ['do you have a patent', 'what did you patent', 'are you an inventor'],
    text: 'Yes. I’m a co-inventor on a Microsoft patent for Loop and the Fluid Framework: “Interactive user interface controls for shared dynamic objects” (US 12,277,305). It grew out of the component identity work I did on Loop.',
    links: [
      { label: 'Patent', href: 'https://www.patentworth.ai/details/12277305' },
      { label: 'Loop case study', href: 'work/microsoft-loop.html' }
    ]
  },
  {
    id: 'messaging',
    anchors: ['messaging', 'messenger', 'thread'],
    title: 'Creating Continuity Across Messaging',
    tags: ['messaging', 'messenger', 'facebook', 'meta', 'conversation', 'conversations', 'private', 'sharing', 'post-send', 'thread', 'entry', 'points', 'continuity', '2023'],
    questions: ['tell me about the messaging project', 'what did you do on facebook messaging', 'what is the messaging case study'],
    text: 'At Meta, private sharing was creating more messaging moments inside Facebook, but those entry points had been designed independently. Depending on where a conversation started, what happened after send, and whether someone stayed in Facebook or moved to Messenger could change.\n\nI treated the fragmented entry points as one interaction problem and defined a model for when an entry point should end with confirmation, open a lightweight thread, or continue into a full conversation. Keeping more conversations in context addressed 100M+ switches to Messenger, and the shipped post-send treatment increased thread opens by about 22% on iOS and 27% on Android.\n\nI was the product designer on this, July to November 2023, working with engineering, content design, research, and data science. The full case study is confidential.',
    links: [{ label: 'Messaging case study', href: 'work/messaging.html' }]
  },
  {
    id: 'accessibility',
    anchors: ['accessibility', 'a11y'],
    title: 'Shaping Accessibility Across Products',
    tags: ['accessibility', 'accessible', 'a11y', 'inclusive', 'inclusion', 'disability', 'review', 'guidance', 'ai', 'retrieval', 'standards', 'requirements', 'meta.com', 'risk', 'website', 'site', 'destination', 'public'],
    questions: ['tell me about accessibility', 'what did you do on accessibility', 'what is the accessibility case study', 'what is the public accessibility site'],
    text: 'At Meta, accessibility issues were often caught late, after teams had already made product decisions. Standards weren’t enough: teams needed to know what applied, when to act, and what to do next.\n\nI designed a lightweight capture flow that started the issue where it happens (the broader review and submission workflows saved over 1,700 hours of manual work), turned requirements into practical guidance for design and build decisions, and made AI-assisted guidance more reliable by organizing product questions around what people were trying to do. I also launched Meta’s first centralized public accessibility destination, organizing 30+ features and 45 support articles around people’s needs first.\n\nThat ran from December 2023 to July 2026. The full case study is confidential; the public destination is live.',
    links: [
      { label: 'Accessibility case study', href: 'work/accessibility.html' },
      { label: 'Accessibility at Meta', href: 'https://www.meta.com/accessibility/' }
    ]
  },
  {
    id: 'loop',
    anchors: ['loop'],
    title: 'Giving Components an Identity',
    tags: ['loop', 'microsoft', 'components', 'component', 'collaboration', 'collaborative', 'teams', 'fluid', 'identity', 'm365', '365', 'office', 'role'],
    questions: ['tell me about microsoft loop', 'what did you do on loop', 'what is the loop case study', 'what are loop components'],
    text: 'Microsoft Loop introduced live, collaborative components that stayed up to date across Microsoft 365. The open question was how this new kind of object should behave and stay recognizable across products.\n\nI defined the core identity and interaction cues that kept a Loop component recognizable across Microsoft 365, later reflected in the patented model. I helped shape the early interaction model and visual identity for the first components, which shipped in Teams, and the component header and boundary became conventions that were later codified in Microsoft’s public developer guidance.\n\nI was a UX designer on this from January 2021 into 2022, across interaction, platform, and visual design.',
    links: [
      { label: 'Loop case study', href: 'work/microsoft-loop.html' },
      { label: 'Loop launch, The Verge', href: 'https://www.theverge.com/2023/11/15/23959801/microsoft-loop-launch-notion-competitor' }
    ]
  },
  {
    id: 'groups',
    anchors: ['groups'],
    title: 'Helping People Navigate Communities',
    tags: ['groups', 'group', 'communities', 'community', 'facebook', 'meta', 'home', 'feed', 'navigate', 'navigation', 'orientation', 'featured', 'content', 'freshness', 'design', 'system'],
    questions: ['tell me about facebook groups', 'what did you do on groups', 'what is the groups case study'],
    text: 'At Meta, Group Home had become crowded before members reached the content. Simplifying the landing experience meant preserving the cues people still needed to orient.\n\nI simplified the top of Group Home while keeping the identity cues members relied on, explored states for returning members so stronger content intent could bring the feed forward, and designed freshness-based behavior so new featured content stayed visible and seen content collapsed, which increased engagement.\n\nThat was March 2022 to April 2023, across interaction design, design systems, and design quality.',
    links: [{ label: 'Groups case study', href: 'work/facebook-groups.html' }]
  },
  {
    id: 'impact',
    title: 'Impact and results',
    tags: ['impact', 'results', 'metrics', 'numbers', 'outcomes', 'success', 'achievements', 'accomplishments', 'proud', 'shipped', 'ship', 'hours', 'increase'],
    questions: ['what is your impact', 'what results have you had', 'what are you most proud of', 'what have you shipped'],
    text: 'A few numbers from my portfolio, as I describe them there:\n\nMessaging: kept more conversations in context, addressing 100M+ switches to Messenger, and the post-send treatment increased thread opens by about 22% on iOS and 27% on Android.\n\nAccessibility: review and submission workflows saved over 1,700 hours of manual work, and the public destination organizes 30+ features and 45 support articles.\n\nLoop: the component identity shipped in Teams and is reflected in a patent.',
    links: [{ label: 'Selected work', href: 'index.html#work-section' }]
  },
  {
    id: 'ai',
    title: 'AI',
    tags: ['ai', 'artificial', 'intelligence', 'llm', 'llms', 'claude', 'agents', 'built', 'chatbot', 'machine', 'learning', 'retrieval', 'site', 'website', 'made', 'generated'],
    questions: ['do you work with ai', 'what is your experience with ai', 'did you build this site with ai', 'who built this site', 'is the site made with ai', 'did ai build this'],
    text: 'Yes, in a few ways. At Meta I worked on AI-assisted accessibility guidance, organizing product questions around what people were trying to do and restructuring the underlying content so retrieval stopped returning deprecated results.\n\nI design and build with AI tools too, including Claude and Claude Code. This site says it plainly in the footer: human directed, AI built.'
  },
  {
    id: 'confidential',
    title: 'Confidential case studies',
    tags: ['password', 'confidential', 'private', 'protected', 'access', 'full', 'case', 'study', 'studies', 'nda', 'locked', 'unlock'],
    questions: ['can i see the full case study', 'what is the password', 'how do i get access', 'why are the case studies locked'],
    text: 'The full Messaging and Accessibility case studies are confidential. The summary pages are public, and you can request the password by email if you’d like to go deeper.',
    links: [{ label: 'Email Jenna', href: 'mailto:ammerallj@gmail.com' }]
  },
  {
    id: 'contact',
    title: 'Contact',
    tags: ['contact', 'email', 'reach', 'hire', 'hiring', 'available', 'availability', 'linkedin', 'talk', 'connect', 'hello', 'opportunity', 'opportunities', 'job', 'recruiter', 'message', 'touch', 'dm'],
    questions: ['how can i contact you', 'how do i get in touch', 'get in touch', 'how do i reach you', 'are you available', 'are you hiring', 'what is your email', 'are you open to work'],
    text: 'The best way to reach me is email, or LinkedIn. If something here resonated, say hello.',
    links: [
      { label: 'ammerallj@gmail.com', href: 'mailto:ammerallj@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ammerallj/' }
    ]
  },
  {
    id: 'maeve',
    anchors: ['maeve', 'dachshund'],
    title: 'Maeve',
    tags: ['maeve', 'dog', 'dachshund', 'doxie', 'puppy', 'pet', 'pets', 'wiener', 'weiner'],
    questions: ['who is maeve', 'do you have a dog', 'do you have pets', 'tell me about your dog'],
    text: 'Maeve is my dachshund. I spend a lot of time with her away from the screen.',
    app: 'maeve'
  },
  {
    id: 'interests',
    title: 'What I’m into',
    tags: ['interests', 'hobbies', 'fun', 'free', 'outside', 'weekend', 'music', 'art', 'exhibitions', 'exhibits', 'museums', 'galleries', 'references', 'inspiration', 'inspired', 'listening', 'personal', 'life'],
    questions: ['what do you do for fun', 'what are your hobbies', 'what are your interests', 'what do you do outside of work', 'what music do you like'],
    text: 'Away from the screen, I spend a lot of time with my dachshund, Maeve. I’m usually discovering new music or wandering through an art exhibition, collecting ideas and references along the way.',
    app: 'maeve'
  },
  {
    id: 'fashion',
    anchors: ['fashion', 'pinterest'],
    title: 'Fashion',
    tags: ['fashion', 'style', 'outfit', 'outfits', 'clothes', 'clothing', 'trend', 'trends', 'moodboard', 'pinterest', 'wear', 'wardrobe', 'aesthetic', 'taste'],
    questions: ['do you like fashion', 'what is your style', 'what are you saving on pinterest', 'what are you wearing'],
    text: 'I collect references constantly, and fashion is a big part of that. I keep a trend moodboard of what I’m saving lately.',
    app: 'fashion'
  },
  {
    id: 'condo',
    anchors: ['condo'],
    title: 'Condo board',
    tags: ['condo', 'condominium', 'association', 'board', 'hoa', 'community', 'volunteer', 'volunteering', 'neighbors', 'neighbours'],
    questions: ['are you on a board', 'do you volunteer', 'what is the condo board'],
    text: 'I serve on the board of my condominium association, where I’ve discovered I genuinely enjoy the odd challenge of keeping a small community running.'
  },
  {
    id: 'jennaos',
    title: 'What is JennaOS',
    tags: ['jennaos', 'os', 'operating', 'system', 'brain', 'this', 'site', 'website', 'portfolio', 'built', 'prototype'],
    questions: ['what is jennaos', 'what is this', 'what is this thing', 'how does this work', 'why an operating system'],
    text: 'JennaOS is my brain, as an operating system: a small place to look inside how I think. Ask me anything, or poke around the pills to learn about me, what I’m into, and how I approach design.',
    app: 'start'
  }
];
