import { PAGE_H, PAGE_W, ellipse, line, muted, rect, rows, text } from './builders';
import { moreTemplates } from './catalogMore';
import type { Template } from './types';

const M = 56; // side margin
const W = PAGE_W - M * 2; // width between the margins

const entry = (y: number, role: string, where: string, when: string, note: string) => [
	text(M, y, 520, role, { size: 15, weight: '600' }),
	text(M + 520, y, W - 520, when, { size: 12, color: muted, align: 'right' }),
	text(M, y + 22, W, where, { size: 13, color: muted }),
	text(M, y + 46, W, note, { size: 13, lines: 2 })
];

const heading = (y: number, label: string, accent: string) => [
	text(M, y, W, label, { size: 12, weight: '700', color: accent, transform: 'uppercase' }),
	line(M, y + 24, W)
];

const resume: Template = {
	id: 'resume',
	name: 'Resume',
	description: 'A clean one-page resume with experience, education and skills.',
	category: 'Career',
	accent: '#0f6cbd',
	elements: [
		rect(0, 0, PAGE_W, 150, '#0f6cbd'),
		text(M, 44, W, 'Alex Morgan', { size: 40, weight: '700', color: '#ffffff' }),
		text(M, 98, W, 'Product designer', { size: 16, color: '#dcebf7' }),
		text(M, 170, W, 'alex@example.com   ·   +1 555 010 2030   ·   Lisbon, Portugal', {
			size: 12,
			color: muted
		}),
		...heading(214, 'Profile', '#0f6cbd'),
		text(
			M,
			250,
			W,
			'Designer with eight years of experience turning complex products into clear, friendly interfaces. I work closely with engineers and researchers, and care about the details.',
			{ size: 13, lines: 3 }
		),
		...heading(346, 'Experience', '#0f6cbd'),
		...entry(
			384,
			'Senior product designer',
			'Northwind Studio',
			'2021 – now',
			'Led the redesign of the booking flow, lifting completed bookings by 18%.\nBuilt and maintain a design system used by six product teams.'
		),
		...entry(
			480,
			'Product designer',
			'Fabrikam',
			'2018 – 2021',
			'Shipped the first mobile app and ran weekly usability sessions.\nMentored two junior designers.'
		),
		...entry(
			576,
			'Interaction designer',
			'Contoso Labs',
			'2016 – 2018',
			'Prototyped dashboards for logistics teams and tested them on site.\nIntroduced a shared research library.'
		),
		...heading(684, 'Education', '#0f6cbd'),
		...entry(722, 'BA in Interaction Design', 'University of the Arts', '2012 – 2016', ''),
		...heading(804, 'Skills', '#0f6cbd'),
		...rows(M, 842, 260, 24, ['Figma and prototyping', 'Design systems', 'User research'], {
			size: 13
		}),
		...rows(
			M + 300,
			842,
			260,
			24,
			['Accessibility (WCAG)', 'HTML and CSS', 'Workshop facilitation'],
			{
				size: 13
			}
		)
	]
};

const coverLetter: Template = {
	id: 'cover-letter',
	name: 'Cover letter',
	description: 'A formal letter layout with your details, the date and room for the body.',
	category: 'Career',
	accent: '#0f6cbd',
	elements: [
		rect(M, 56, 8, 64, '#0f6cbd'),
		text(M + 22, 56, 400, 'Alex Morgan', { size: 26, weight: '700' }),
		text(M + 22, 94, 400, 'Product designer', { size: 13, color: muted }),
		text(M, 56, W, 'alex@example.com\n+1 555 010 2030\nLisbon, Portugal', {
			size: 12,
			color: muted,
			align: 'right'
		}),
		line(M, 150, W),
		text(M, 190, W, 'March 3, 2026', { size: 13 }),
		text(M, 236, W, 'Jordan Lee\nHiring manager, Fabrikam\n12 Harbour Street, Lisbon', {
			size: 13,
			lines: 3
		}),
		text(M, 340, W, 'Dear Jordan,', { size: 14 }),
		text(
			M,
			378,
			W,
			'I am writing to apply for the Senior Designer role. Over eight years I have shipped products people use every day, and I would love to bring that experience to your team.\n\nIn my current role I led the redesign of a booking flow used by two million people and built the design system behind it. I enjoy the whole loop, from the first interview to the final detail in the code review.\n\nI would welcome the chance to talk about how I can help. Thank you for your time and for considering my application.',
			{ size: 13, lines: 13 }
		),
		text(M, 740, W, 'Kind regards,', { size: 14 }),
		text(M, 800, W, 'Alex Morgan', {
			size: 18,
			weight: '600',
			italic: true,
			font: 'Playfair Display'
		})
	]
};

const invoice: Template = {
	id: 'invoice',
	name: 'Invoice',
	description: 'An invoice with line items, totals and payment details.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		text(M, 56, 360, 'Invoice', { size: 44, weight: '700', color: '#0f6cbd' }),
		text(M + 400, 60, W - 400, 'Northwind Studio\n12 Harbour Street\nLisbon, Portugal', {
			size: 12,
			color: muted,
			align: 'right',
			lines: 3
		}),
		line(M, 140, W, '#0f6cbd', 2),
		text(M, 170, 240, 'Billed to', {
			size: 11,
			weight: '700',
			color: muted,
			transform: 'uppercase'
		}),
		text(M, 192, 240, 'Fabrikam Ltd\n8 Market Square\nLondon', { size: 13, lines: 3 }),
		text(M + 340, 170, 240, 'Invoice no.', {
			size: 11,
			weight: '700',
			color: muted,
			transform: 'uppercase'
		}),
		text(M + 340, 192, 240, 'INV-0042', { size: 13 }),
		text(M + 560, 170, 240, 'Due', {
			size: 11,
			weight: '700',
			color: muted,
			transform: 'uppercase'
		}),
		text(M + 560, 192, 240, 'April 2, 2026', { size: 13 }),
		rect(M, 300, W, 34, '#0f6cbd', { opacity: 0.12 }),
		text(M + 8, 308, 380, 'Description', { size: 12, weight: '700' }),
		text(M + 400, 308, 80, 'Qty', { size: 12, weight: '700', align: 'right' }),
		text(M + 500, 308, 120, 'Price', { size: 12, weight: '700', align: 'right' }),
		text(M + 640, 308, W - 648, 'Amount', { size: 12, weight: '700', align: 'right' }),
		...[
			['Brand identity', '1', '1,800.00', '1,800.00'],
			['Website design', '1', '2,400.00', '2,400.00'],
			['Design review sessions', '4', '150.00', '600.00']
		].flatMap(([d, q, p, a], i) => [
			text(M + 8, 352 + i * 44, 380, d, { size: 13 }),
			text(M + 400, 352 + i * 44, 80, q, { size: 13, align: 'right' }),
			text(M + 500, 352 + i * 44, 120, p, { size: 13, align: 'right' }),
			text(M + 640, 352 + i * 44, W - 648, a, { size: 13, align: 'right' }),
			line(M, 384 + i * 44, W)
		]),
		text(M + 460, 520, 160, 'Subtotal\nTax (20%)', {
			size: 13,
			color: muted,
			align: 'right',
			lines: 2
		}),
		text(M + 640, 520, W - 648, '4,800.00\n960.00', { size: 13, align: 'right', lines: 2 }),
		rect(M + 460, 580, W - 460, 44, '#0f6cbd'),
		text(M + 476, 590, 140, 'Total due', { size: 14, weight: '600', color: '#ffffff' }),
		text(M + 640, 588, W - 648, '€5,760.00', {
			size: 18,
			weight: '700',
			color: '#ffffff',
			align: 'right'
		}),
		text(M, 700, W, 'Payment', { size: 11, weight: '700', color: muted, transform: 'uppercase' }),
		text(
			M,
			722,
			420,
			'Bank transfer to Northwind Studio\nIBAN PT50 0000 0000 0000 0000 0000 0\nPlease quote the invoice number.',
			{
				size: 12,
				lines: 3
			}
		),
		text(M, 1130, W, 'Thank you for your business.', { size: 12, color: muted, align: 'center' })
	]
};

const letterhead: Template = {
	id: 'letterhead',
	name: 'Letterhead',
	description: 'Branded stationery with your details in the header and footer.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		ellipse(M, 52, 40, 40, '#0f6cbd'),
		text(M + 54, 58, 320, 'Northwind Studio', { size: 20, weight: '700' }),
		text(M + 54, 84, 320, 'Design and brand consultancy', { size: 11, color: muted }),
		text(
			M + 400,
			56,
			W - 400,
			'12 Harbour Street, Lisbon\nhello@northwind.example\n+351 21 000 0000',
			{
				size: 11,
				color: muted,
				align: 'right'
			}
		),
		line(M, 130, W, '#0f6cbd', 2),
		text(
			M,
			190,
			W,
			'Start writing here. Click the text to edit it, or add a new text box from the left.',
			{
				size: 13,
				color: muted,
				lines: 2
			}
		),
		line(M, PAGE_H - 90, W),
		text(M, PAGE_H - 70, W, 'Northwind Studio Lda  ·  Registered in Portugal  ·  VAT PT000000000', {
			size: 10,
			color: muted,
			align: 'center'
		})
	]
};

const report: Template = {
	id: 'one-page-report',
	name: 'One-page report',
	description: 'A tidy summary with headline numbers, findings and next steps.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		text(M, 56, W, 'Quarterly summary', {
			size: 11,
			weight: '700',
			color: '#0f6cbd',
			transform: 'uppercase'
		}),
		text(M, 80, W, 'Customers grew 24% in Q1', { size: 34, weight: '700' }),
		text(M, 132, W, 'A short review of what changed, what worked and what comes next.', {
			size: 14,
			color: muted
		}),
		...[
			['12,480', 'Active customers'],
			['€84k', 'Monthly revenue'],
			['96%', 'Satisfaction']
		].flatMap(([n, label], i) => [
			rect(M + i * 258, 190, 240, 100, '#f5f5f5', { radius: 4 }),
			text(M + 18 + i * 258, 208, 210, n, { size: 30, weight: '700', color: '#0f6cbd' }),
			text(M + 18 + i * 258, 252, 210, label, { size: 12, color: muted })
		]),
		text(M, 340, W, 'What we found', { size: 18, weight: '600' }),
		text(
			M,
			376,
			W,
			'Referrals became our largest source of new customers, ahead of search for the first time. Support response times fell below two hours, and the share of customers who stay after the first month rose to 91%.',
			{ size: 13, lines: 4 }
		),
		rect(M, 480, W, 180, '#0f6cbd', { opacity: 0.08, radius: 4 }),
		...[60, 104, 148].map((h, i) =>
			rect(M + 40 + i * 120, 640 - h, 64, h, '#0f6cbd', { radius: 2 })
		),
		...['Jan', 'Feb', 'Mar'].map((m, i) =>
			text(M + 40 + i * 120, 646, 64, m, { size: 10, color: muted, align: 'center' })
		),
		text(M + 420, 504, W - 440, 'Growth by month', { size: 12, weight: '600' }),
		text(
			M + 420,
			530,
			W - 440,
			'Each month added more customers than the one before, and none were lost to price.',
			{
				size: 12,
				color: muted,
				lines: 3
			}
		),
		text(M, 700, W, 'Next steps', { size: 18, weight: '600' }),
		...rows(
			M,
			740,
			W,
			32,
			[
				'1.   Open a second support shift in the afternoons',
				'2.   Launch the referral reward in April',
				'3.   Review pricing for teams of ten or more'
			],
			{
				size: 13
			}
		)
	]
};

const flyer: Template = {
	id: 'event-flyer',
	name: 'Event flyer',
	description: 'A bold flyer for a party, market or community event.',
	category: 'Events',
	accent: '#c239b3',
	elements: [
		rect(0, 0, PAGE_W, PAGE_H, '#1f1f1f'),
		ellipse(470, 60, 390, 390, '#c239b3', { opacity: 0.9 }),
		ellipse(480, 820, 380, 380, '#0f6cbd', { opacity: 0.9 }),
		text(M, 80, 420, 'Summer\nNight\nMarket', {
			size: 84,
			weight: '800',
			color: '#ffffff',
			lines: 3
		}),
		text(M, 440, 420, 'Food, music and local makers', { size: 18, color: '#f2f2f2' }),
		line(M, 761, W, '#ffffff', 3),
		text(M, 790, 360, 'Saturday\nJuly 12', { size: 34, weight: '700', color: '#ffffff', lines: 2 }),
		text(M + 360, 790, W - 360, '6 pm until late\nHarbour Square\nFree entry', {
			size: 18,
			color: '#f2f2f2',
			lines: 3
		}),
		rect(M, 1040, 220, 52, '#ffffff', { radius: 8 }),
		text(M, 1054, 220, 'See you there', {
			size: 16,
			weight: '700',
			color: '#1f1f1f',
			align: 'center'
		})
	]
};

const poster: Template = {
	id: 'poster',
	name: 'Poster',
	description: 'A big-headline poster with one strong message.',
	category: 'Events',
	accent: '#0f6cbd',
	elements: [
		rect(0, 0, PAGE_W, PAGE_H, '#fef6e4'),
		ellipse(220, 520, 420, 420, '#0f6cbd'),
		ellipse(600, 110, 170, 170, '#f5a623'),
		rect(M, 960, 130, 130, '#e8453c', { radius: 6 }),
		text(M, 56, W, 'Make\nsomething\nworth\nseeing', {
			size: 96,
			weight: '800',
			color: '#1b1b1b',
			lines: 4
		}),
		text(M + 170, 980, W - 170, 'Open studio week\nMay 5 – 11, every day from 10 am', {
			size: 20,
			weight: '600',
			color: '#1b1b1b',
			lines: 2
		}),
		text(M + 170, 1052, W - 170, 'Free for everyone. Bring a friend.', {
			size: 14,
			color: '#4a4a4a'
		})
	]
};

const invitation: Template = {
	id: 'invitation',
	name: 'Invitation',
	description: 'An elegant invitation for a dinner, birthday or celebration.',
	category: 'Events',
	accent: '#8a6d3b',
	elements: [
		rect(32, 32, PAGE_W - 64, PAGE_H - 64, '#8a6d3b', { outline: '#8a6d3b', lineWidth: 2 }),
		rect(48, 48, PAGE_W - 96, PAGE_H - 96, '#8a6d3b', { outline: '#8a6d3b', lineWidth: 1 }),
		text(M, 190, W, 'You are invited', {
			size: 14,
			color: '#8a6d3b',
			align: 'center',
			transform: 'uppercase'
		}),
		text(M, 250, W, 'Maya’s\nBirthday Dinner', {
			size: 56,
			weight: '600',
			align: 'center',
			font: 'Playfair Display',
			lines: 2
		}),
		line(PAGE_W / 2 - 40, 450, 80, '#8a6d3b', 2),
		text(M, 490, W, 'Saturday, October 18', {
			size: 22,
			align: 'center',
			font: 'Playfair Display'
		}),
		text(M, 530, W, 'at seven in the evening', { size: 15, color: muted, align: 'center' }),
		text(M, 640, W, 'The Garden Room\n24 Orchard Lane', { size: 16, align: 'center', lines: 2 }),
		text(
			M,
			800,
			W,
			'Dinner and dancing to follow.\nPlease reply by October 1 to maya@example.com',
			{
				size: 13,
				color: muted,
				align: 'center',
				lines: 2
			}
		)
	]
};

const menu: Template = {
	id: 'menu',
	name: 'Menu',
	description: 'A two-column menu for a café or restaurant.',
	category: 'Events',
	accent: '#107c10',
	elements: [
		text(M, 64, W, 'Olive & Fig', {
			size: 44,
			weight: '600',
			align: 'center',
			font: 'Playfair Display'
		}),
		text(M, 124, W, 'Kitchen and café', {
			size: 12,
			color: muted,
			align: 'center',
			transform: 'uppercase'
		}),
		line(M, 170, W, '#107c10', 2),
		...[
			{
				x: M,
				title: 'Starters',
				items: [
					['Roasted tomato soup', '7'],
					['Whipped feta, honey, toast', '9'],
					['Charred greens, lemon', '8']
				]
			},
			{
				x: M + 420,
				title: 'Mains',
				items: [
					['Mushroom and thyme risotto', '16'],
					['Grilled sea bass, fennel', '21'],
					['Roast squash, tahini', '15']
				]
			}
		].flatMap(({ x, title, items }) => [
			text(x, 214, 336, title, {
				size: 20,
				weight: '600',
				color: '#107c10',
				font: 'Playfair Display'
			}),
			...items.flatMap(([dish, price], i) => [
				text(x, 262 + i * 62, 276, dish, { size: 14, weight: '500' }),
				text(x + 276, 262 + i * 62, 60, price, { size: 14, align: 'right' }),
				text(x, 284 + i * 62, 336, 'Made fresh each morning', { size: 11, color: muted })
			])
		]),
		text(M, 540, 336, 'Desserts', {
			size: 20,
			weight: '600',
			color: '#107c10',
			font: 'Playfair Display'
		}),
		...[
			['Fig and almond tart', '8'],
			['Dark chocolate pot', '7']
		].flatMap(([dish, price], i) => [
			text(M, 588 + i * 44, 276, dish, { size: 14, weight: '500' }),
			text(M + 276, 588 + i * 44, 60, price, { size: 14, align: 'right' })
		]),
		text(M + 420, 540, 336, 'Drinks', {
			size: 20,
			weight: '600',
			color: '#107c10',
			font: 'Playfair Display'
		}),
		...[
			['Filter coffee', '3'],
			['Fresh mint tea', '3.5'],
			['House lemonade', '4']
		].flatMap(([dish, price], i) => [
			text(M + 420, 588 + i * 44, 276, dish, { size: 14, weight: '500' }),
			text(M + 420 + 276, 588 + i * 44, 60, price, { size: 14, align: 'right' })
		]),
		text(M, 1120, W, 'Please tell us about allergies before you order.', {
			size: 11,
			color: muted,
			align: 'center'
		})
	]
};

const certificate: Template = {
	id: 'certificate',
	name: 'Certificate',
	description: 'A certificate of achievement with a border and signature lines.',
	category: 'Education',
	accent: '#8a6d3b',
	elements: [
		rect(28, 28, PAGE_W - 56, PAGE_H - 56, '#8a6d3b', { outline: '#8a6d3b', lineWidth: 6 }),
		rect(46, 46, PAGE_W - 92, PAGE_H - 92, '#8a6d3b', { outline: '#8a6d3b', lineWidth: 1 }),
		text(M, 210, W, 'Certificate', {
			size: 58,
			weight: '600',
			align: 'center',
			font: 'Playfair Display'
		}),
		text(M, 286, W, 'of achievement', {
			size: 16,
			color: '#8a6d3b',
			align: 'center',
			transform: 'uppercase'
		}),
		text(M, 400, W, 'This certificate is proudly presented to', {
			size: 14,
			color: muted,
			align: 'center'
		}),
		text(M, 450, W, 'Jordan Lee', {
			size: 46,
			align: 'center',
			italic: true,
			font: 'Playfair Display'
		}),
		line(M + 140, 530, W - 280, '#8a6d3b', 1),
		text(
			M + 60,
			570,
			W - 120,
			'for outstanding effort and for completing the Introduction to Design course with distinction.',
			{
				size: 15,
				align: 'center',
				lines: 2
			}
		),
		ellipse(PAGE_W / 2 - 48, 720, 96, 96, '#8a6d3b', { opacity: 0.9 }),
		text(M, 744, W, '★', { size: 40, color: '#ffffff', align: 'center' }),
		line(M + 60, 980, 240),
		line(PAGE_W - M - 300, 980, 240),
		text(M + 60, 992, 240, 'Date', { size: 12, color: muted, align: 'center' }),
		text(PAGE_W - M - 300, 992, 240, 'Instructor', { size: 12, color: muted, align: 'center' })
	]
};

const handout: Template = {
	id: 'lesson-handout',
	name: 'Lesson handout',
	description: 'A handout with objectives, key ideas and practice questions.',
	category: 'Education',
	accent: '#107c10',
	elements: [
		rect(0, 0, PAGE_W, 140, '#107c10'),
		text(M, 36, W, 'Lesson 4', {
			size: 12,
			weight: '700',
			color: '#dff6dd',
			transform: 'uppercase'
		}),
		text(M, 60, W, 'How plants make food', { size: 34, weight: '700', color: '#ffffff' }),
		text(M, 180, W, 'Name: ______________________      Date: ______________', {
			size: 13,
			color: muted
		}),
		rect(M, 232, W, 130, '#dff6dd', { radius: 4 }),
		text(M + 20, 248, W - 40, 'By the end of this lesson you can', {
			size: 14,
			weight: '700',
			color: '#0b5a08'
		}),
		...rows(
			M + 20,
			280,
			W - 40,
			26,
			[
				'•  Name the three things a plant needs for photosynthesis',
				'•  Explain where the process happens inside a leaf',
				'•  Describe why plants matter for all other life'
			],
			{
				size: 13
			}
		),
		text(M, 400, W, 'Key ideas', { size: 20, weight: '600' }),
		text(
			M,
			440,
			W,
			'Plants take in sunlight, water and carbon dioxide. Inside the leaf, chlorophyll captures the light, and the plant turns these into sugar for energy and oxygen for the air.',
			{ size: 13, lines: 4 }
		),
		text(M, 560, W, 'Practice', { size: 20, weight: '600' }),
		...[0, 1, 2].flatMap((i) => [
			text(
				M,
				604 + i * 120,
				W,
				`${i + 1}.   Write your own question here, then leave space for the answer.`,
				{ size: 13 }
			),
			line(M, 664 + i * 120, W)
		])
	]
};

export const templates: Template[] = [
	resume,
	coverLetter,
	invoice,
	letterhead,
	report,
	flyer,
	poster,
	invitation,
	menu,
	certificate,
	handout,
	...moreTemplates
];

export const templateById = (id: string) => templates.find((t) => t.id === id);
