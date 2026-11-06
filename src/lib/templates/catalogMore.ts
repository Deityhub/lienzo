import {
	CONTENT_W as W,
	MARGIN as M,
	PAGE_H,
	PAGE_W,
	ellipse,
	line,
	muted,
	rect,
	rows,
	text
} from './builders';
import type { Template } from './types';

const label = (x: number, y: number, w: number, content: string, color = muted) =>
	text(x, y, w, content, { size: 11, weight: '700', color, transform: 'uppercase' });

const agenda: Template = {
	id: 'meeting-agenda',
	name: 'Meeting agenda',
	description: 'An agenda with times, topics and owners, plus space for notes and actions.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		rect(M, 56, 6, 76, '#0f6cbd'),
		text(M + 22, 52, W - 22, 'Team meeting', { size: 34, weight: '700' }),
		text(M + 22, 100, W - 22, 'Thursday, March 5  ·  10:00 – 11:00  ·  Room 3 or video call', {
			size: 13,
			color: muted
		}),
		label(M, 176, 200, 'Attendees'),
		text(M, 198, W, 'Alex, Jordan, Sam, Priya, Chen', { size: 13 }),
		rect(M, 252, W, 34, '#0f6cbd', { opacity: 0.12 }),
		text(M + 8, 260, 80, 'Time', { size: 12, weight: '700' }),
		text(M + 100, 260, 380, 'Topic', { size: 12, weight: '700' }),
		text(M + 560, 260, 180, 'Owner', { size: 12, weight: '700' }),
		...[
			['10:00', 'Welcome and last week’s actions', 'Alex'],
			['10:10', 'Project status and blockers', 'Jordan'],
			['10:30', 'Launch plan for April', 'Priya'],
			['10:45', 'Open questions', 'Everyone'],
			['10:55', 'Summary and next steps', 'Alex']
		].flatMap(([time, topic, owner], i) => [
			text(M + 8, 304 + i * 44, 80, time, { size: 13, color: muted }),
			text(M + 100, 304 + i * 44, 440, topic, { size: 13 }),
			text(M + 560, 304 + i * 44, 180, owner, { size: 13 }),
			line(M, 334 + i * 44, W)
		]),
		label(M, 560, 200, 'Notes'),
		line(M, 620, W),
		line(M, 668, W),
		line(M, 716, W),
		label(M, 780, 200, 'Actions'),
		...[0, 1, 2].flatMap((i) => [
			rect(M, 818 + i * 44, 16, 16, '#616161', { outline: '#616161', lineWidth: 1 }),
			line(M + 30, 842 + i * 44, W - 30)
		])
	]
};

const quotation: Template = {
	id: 'quotation',
	name: 'Quotation',
	description: 'A price quote with scope, itemised costs and how long it is valid.',
	category: 'Business',
	accent: '#107c10',
	elements: [
		text(M, 56, 400, 'Quotation', { size: 44, weight: '700', color: '#107c10' }),
		text(M + 400, 60, W - 400, 'Harbour Builders\n12 Dock Road\nBristol', {
			size: 12,
			color: muted,
			align: 'right'
		}),
		line(M, 140, W, '#107c10', 2),
		label(M, 170, 240, 'Prepared for'),
		text(M, 192, 300, 'Sam Rivera\n41 Elm Street\nBristol', { size: 13 }),
		label(M + 400, 170, 160, 'Quote no.'),
		text(M + 400, 192, 160, 'Q-1087', { size: 13 }),
		label(M + 580, 170, 176, 'Valid until'),
		text(M + 580, 192, 176, 'April 15, 2026', { size: 13 }),
		label(M, 300, 200, 'Scope of work'),
		text(
			M,
			322,
			W,
			'Strip and replace the kitchen floor, fit new skirting and paint the walls in two coats. Materials and waste removal are included.',
			{ size: 13, lines: 2 }
		),
		rect(M, 406, W, 34, '#107c10', { opacity: 0.12 }),
		text(M + 8, 414, 440, 'Item', { size: 12, weight: '700' }),
		text(M + 560, 414, W - 568, 'Cost', { size: 12, weight: '700', align: 'right' }),
		...[
			['Labour, 3 days', '900.00'],
			['Flooring, 14 m²', '640.00'],
			['Paint and materials', '180.00'],
			['Waste removal', '120.00']
		].flatMap(([item, cost], i) => [
			text(M + 8, 458 + i * 42, 440, item, { size: 13 }),
			text(M + 560, 458 + i * 42, W - 568, cost, { size: 13, align: 'right' }),
			line(M, 488 + i * 42, W)
		]),
		rect(M + 440, 650, W - 440, 44, '#107c10'),
		text(M + 456, 660, 140, 'Estimated total', { size: 14, weight: '600', color: '#ffffff' }),
		text(M + 600, 658, W - 608, '£1,840.00', {
			size: 18,
			weight: '700',
			color: '#ffffff',
			align: 'right'
		}),
		label(M, 760, 300, 'Terms'),
		text(
			M,
			782,
			560,
			'A 25% deposit confirms the booking. The balance is due on completion.\nPrices include VAT.',
			{
				size: 12,
				color: muted,
				lines: 2
			}
		),
		line(M, 940, 240),
		text(M, 950, 240, 'Accepted by (signature and date)', { size: 11, color: muted })
	]
};

const receipt: Template = {
	id: 'receipt',
	name: 'Receipt',
	description: 'A simple receipt that confirms a payment.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		text(M, 56, W, 'Receipt', {
			size: 14,
			weight: '700',
			color: '#0f6cbd',
			transform: 'uppercase'
		}),
		text(M, 82, W, 'Payment received', { size: 38, weight: '700' }),
		text(M, 138, W, 'Thank you. This confirms that your payment has been received in full.', {
			size: 14,
			color: muted
		}),
		rect(M, 196, W, 110, '#f5f5f5', { radius: 4 }),
		label(M + 24, 218, 200, 'Amount paid'),
		text(M + 24, 238, 400, '€240.00', { size: 40, weight: '700', color: '#0f6cbd' }),
		label(M + 480, 218, 200, 'Paid on'),
		text(M + 480, 238, 240, 'March 3, 2026', { size: 16, weight: '600' }),
		...[
			['Receipt no.', 'R-2026-0318'],
			['Received from', 'Jordan Lee'],
			['For', 'Photography session, 2 hours'],
			['Payment method', 'Card ending 4242'],
			['Received by', 'Northwind Studio']
		].flatMap(([k, v], i) => [
			text(M, 350 + i * 52, 240, k, { size: 13, color: muted }),
			text(M + 260, 350 + i * 52, W - 260, v, { size: 14, weight: '500' }),
			line(M, 382 + i * 52, W)
		]),
		text(M, 680, W, 'Keep this receipt for your records. Questions? hello@northwind.example', {
			size: 12,
			color: muted
		})
	]
};

const proposal: Template = {
	id: 'proposal-cover',
	name: 'Proposal cover',
	description: 'A strong cover page for a proposal, report or pitch.',
	category: 'Business',
	accent: '#0f6cbd',
	elements: [
		rect(0, 0, PAGE_W, PAGE_H, '#0b3a66'),
		ellipse(420, 560, 640, 640, '#0f6cbd', { opacity: 0.55 }),
		ellipse(560, 760, 360, 360, '#2b88d8', { opacity: 0.6 }),
		text(M, 70, W, 'Northwind Studio', { size: 16, weight: '600', color: '#cfe4f7' }),
		text(M, 340, 640, 'Website redesign\nproposal', {
			size: 62,
			weight: '800',
			color: '#ffffff',
			lines: 2
		}),
		rect(M, 520, 90, 5, '#ffffff'),
		text(M, 550, 560, 'Prepared for Fabrikam Ltd\nMarch 2026', {
			size: 18,
			color: '#cfe4f7',
			lines: 2
		}),
		text(M, 1110, W, 'Confidential  ·  Valid for 30 days', { size: 12, color: '#9ec3e6' })
	]
};

const saveTheDate: Template = {
	id: 'save-the-date',
	name: 'Save the date',
	description: 'A romantic save-the-date for a wedding or milestone.',
	category: 'Events',
	accent: '#b4546b',
	elements: [
		rect(0, 0, PAGE_W, PAGE_H, '#fdf3f4'),
		rect(40, 40, PAGE_W - 80, PAGE_H - 80, '#b4546b', { outline: '#b4546b', lineWidth: 1.5 }),
		text(M, 260, W, 'Save the date', {
			size: 18,
			color: '#b4546b',
			align: 'center',
			transform: 'uppercase'
		}),
		text(M, 340, W, 'Anna\n&\nMarco', {
			size: 72,
			align: 'center',
			italic: true,
			font: 'Playfair Display',
			color: '#3b1f27',
			lines: 3
		}),
		rect(PAGE_W / 2 - 50, 650, 100, 2, '#b4546b'),
		text(M, 690, W, 'September 12, 2026', { size: 26, align: 'center', font: 'Playfair Display' }),
		text(M, 740, W, 'Villa Rosa, Tuscany', { size: 15, color: muted, align: 'center' }),
		text(M, 960, W, 'Invitation to follow', {
			size: 13,
			color: muted,
			align: 'center',
			italic: true
		})
	]
};

const voucher: Template = {
	id: 'gift-voucher',
	name: 'Gift voucher',
	description: 'A gift voucher with an amount, a message and a code.',
	category: 'Events',
	accent: '#c239b3',
	elements: [
		rect(M, 120, W, 420, '#fdf0fb', { radius: 3 }),
		rect(M, 120, W, 420, '#c239b3', { outline: '#c239b3', lineWidth: 3, radius: 3 }),
		ellipse(PAGE_W - M - 150, 120, 150, 150, '#c239b3', { opacity: 0.18 }),
		text(M + 40, 160, 400, 'Gift voucher', {
			size: 44,
			weight: '700',
			color: '#7a1f6f',
			font: 'Playfair Display'
		}),
		text(M + 40, 226, 400, 'From Olive & Fig', { size: 14, color: muted }),
		text(M + 40, 300, 300, '€50', { size: 90, weight: '800', color: '#c239b3' }),
		label(M + 400, 316, 300, 'To'),
		line(M + 400, 358, 296, '#7a1f6f'),
		label(M + 400, 384, 300, 'From'),
		line(M + 400, 426, 296, '#7a1f6f'),
		text(
			M + 40,
			480,
			W - 80,
			'Code  OF-7342-ZQ9   ·   Valid until December 31, 2026   ·   Cannot be exchanged for cash',
			{
				size: 11,
				color: muted
			}
		)
	]
};

const resignation: Template = {
	id: 'resignation-letter',
	name: 'Resignation letter',
	description: 'A short, polite letter of resignation with a notice period.',
	category: 'Career',
	accent: '#616161',
	elements: [
		text(M, 56, W, 'Alex Morgan\n14 Rua do Sol\nLisbon, Portugal', {
			size: 13,
			color: muted,
			lines: 3
		}),
		text(M, 170, W, 'March 3, 2026', { size: 13 }),
		text(M, 216, W, 'Jordan Lee\nHead of Design, Fabrikam', { size: 13, lines: 2 }),
		text(M, 306, W, 'Subject: Resignation', { size: 14, weight: '700' }),
		text(M, 350, W, 'Dear Jordan,', { size: 14 }),
		text(
			M,
			388,
			W,
			'Please accept this letter as formal notice that I am resigning from my role as Senior Designer. My last day will be April 3, 2026, in line with my one-month notice period.\n\nThank you for the support and the opportunities I have had over the past five years. I am proud of what the team has built, and I will do everything I can to make the handover smooth.\n\nPlease let me know how I can help in the coming weeks.',
			{ size: 13, lines: 12 }
		),
		text(M, 680, W, 'Yours sincerely,', { size: 14 }),
		text(M, 740, W, 'Alex Morgan', {
			size: 18,
			weight: '600',
			italic: true,
			font: 'Playfair Display'
		})
	]
};

const weekly: Template = {
	id: 'weekly-planner',
	name: 'Weekly planner',
	description: 'A week at a glance with a space for each day and a focus box.',
	category: 'Personal',
	accent: '#0f6cbd',
	elements: [
		rect(0, 0, PAGE_W, 120, '#0f6cbd'),
		text(M, 34, 400, 'Week of  ____ / ____', { size: 30, weight: '700', color: '#ffffff' }),
		text(M + 440, 44, W - 440, 'Plan the week, then do it.', {
			size: 13,
			color: '#dcebf7',
			align: 'right'
		}),
		rect(M, 148, W, 90, '#f5f5f5', { radius: 4 }),
		label(M + 18, 164, 300, 'Focus this week', '#0f6cbd'),
		line(M + 18, 214, W - 36),
		...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].flatMap((day, i) => [
			text(M, 268 + i * 100, 140, day, { size: 14, weight: '700' }),
			line(M + 140, 290 + i * 100, W - 140),
			line(M + 140, 330 + i * 100, W - 140)
		]),
		text(M, 772, 140, 'Weekend', { size: 14, weight: '700' }),
		line(M + 140, 794, W - 140),
		line(M + 140, 834, W - 140)
	]
};

const recipe: Template = {
	id: 'recipe-card',
	name: 'Recipe card',
	description: 'A recipe with ingredients, steps and a few key details.',
	category: 'Personal',
	accent: '#c4511a',
	elements: [
		rect(0, 0, PAGE_W, 140, '#c4511a'),
		text(M, 36, W, 'Recipe', { size: 12, weight: '700', color: '#fbe3d6', transform: 'uppercase' }),
		text(M, 62, W, 'Lemon & herb roast chicken', { size: 34, weight: '700', color: '#ffffff' }),
		...[
			['Prep', '15 min'],
			['Cook', '1 hr 20'],
			['Serves', '4']
		].flatMap(([k, v], i) => [
			text(M + i * 220, 170, 200, k, {
				size: 11,
				weight: '700',
				color: muted,
				transform: 'uppercase'
			}),
			text(M + i * 220, 190, 200, v, { size: 20, weight: '600' })
		]),
		line(M, 246, W),
		text(M, 276, 260, 'Ingredients', {
			size: 20,
			weight: '600',
			color: '#c4511a',
			font: 'Playfair Display'
		}),
		...rows(
			M,
			322,
			260,
			34,
			[
				'1 whole chicken, 1.5 kg',
				'2 lemons',
				'4 cloves of garlic',
				'A handful of thyme',
				'3 tbsp olive oil',
				'Salt and pepper'
			],
			{ size: 14 }
		),
		text(M + 320, 276, W - 320, 'Method', {
			size: 20,
			weight: '600',
			color: '#c4511a',
			font: 'Playfair Display'
		}),
		...rows(
			M + 320,
			322,
			W - 320,
			46,
			[
				'1.  Heat the oven to 200°C.',
				'2.  Rub the chicken with oil, salt and pepper.',
				'3.  Fill with lemon, garlic and thyme.',
				'4.  Roast for 80 minutes, then rest for 10.'
			],
			{ size: 14, lines: 2 }
		)
	]
};

const timetable: Template = {
	id: 'class-timetable',
	name: 'Class timetable',
	description: 'A weekly timetable for school or study, in colour.',
	category: 'Education',
	accent: '#107c10',
	elements: [
		text(M, 56, W, 'Class timetable', { size: 34, weight: '700' }),
		text(M, 106, W, 'Autumn term  ·  Name: ____________________', { size: 13, color: muted }),
		rect(M, 160, W, 38, '#107c10'),
		...['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, i) =>
			text(M + 92 + i * 132, 169, 120, d, {
				size: 13,
				weight: '700',
				color: '#ffffff',
				align: 'center'
			})
		),
		...['9:00', '10:00', '11:00', '12:00', '1:30', '2:30'].flatMap((time, r) => [
			text(M + 8, 220 + r * 86, 76, time, { size: 12, color: muted }),
			line(M, 208 + r * 86, W)
		]),
		...[
			[0, 0, 'Maths', '#dff6dd'],
			[1, 0, 'English', '#deecf9'],
			[2, 0, 'Science', '#fdf3c8'],
			[3, 0, 'Maths', '#dff6dd'],
			[4, 0, 'Art', '#fbe0ee'],
			[0, 1, 'Science', '#fdf3c8'],
			[1, 1, 'History', '#e8e0f7'],
			[2, 1, 'English', '#deecf9'],
			[3, 1, 'Music', '#fde3d6'],
			[4, 1, 'Maths', '#dff6dd'],
			[1, 3, 'Sport', '#d9f2f0'],
			[3, 3, 'Sport', '#d9f2f0']
		].flatMap(([col, row, subject, color]) => [
			rect(M + 92 + (col as number) * 132, 216 + (row as number) * 86, 124, 74, color as string, {
				radius: 6
			}),
			text(M + 92 + (col as number) * 132, 238 + (row as number) * 86, 124, subject as string, {
				size: 14,
				weight: '600',
				align: 'center',
				color: '#242424'
			})
		])
	]
};

const thankYou: Template = {
	id: 'thank-you-card',
	name: 'Thank-you card',
	description: 'A warm thank-you note with room for a personal message.',
	category: 'Events',
	accent: '#107c10',
	elements: [
		rect(0, 0, PAGE_W, PAGE_H, '#f3faf2'),
		ellipse(-140, -140, 420, 420, '#107c10', { opacity: 0.16 }),
		ellipse(PAGE_W - 280, PAGE_H - 280, 520, 520, '#107c10', { opacity: 0.16 }),
		text(M, 300, W, 'Thank you', {
			size: 84,
			align: 'center',
			italic: true,
			font: 'Playfair Display',
			color: '#0b5a08'
		}),
		rect(PAGE_W / 2 - 40, 450, 80, 3, '#107c10'),
		text(
			M + 80,
			500,
			W - 160,
			'Your kindness made our day. We are so grateful to have you in our lives.',
			{
				size: 18,
				align: 'center',
				color: '#2b4a2a',
				lines: 3
			}
		),
		text(M, 720, W, 'With love,\nThe Rivera family', {
			size: 16,
			align: 'center',
			color: '#0b5a08',
			lines: 2
		})
	]
};

export const moreTemplates: Template[] = [
	agenda,
	quotation,
	receipt,
	proposal,
	saveTheDate,
	voucher,
	resignation,
	weekly,
	recipe,
	timetable,
	thankYou
];
