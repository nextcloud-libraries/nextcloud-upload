import { GettextExtractor, JsExtractors } from 'gettext-extractor'

const extractor = new GettextExtractor()
extractor
	.createJsParser([
		JsExtractors.callExpression('t', {
			arguments: {
				text: 0,
			},
			comments: {
				otherLineLeading: true,
				sameLineLeading: true,
				sameLineTrailing: true,
				regex: /TRANSLATORS\s*(.*)/m,
			},
		}),
		JsExtractors.callExpression('n', {
			arguments: {
				text: 1,
				textPlural: 2,
			},
			comments: {
				otherLineLeading: true,
				sameLineLeading: true,
				sameLineTrailing: true,
				regex: /TRANSLATORS\s*(.*)/m,
			},
		}),
	])
	.parseFilesGlob('./lib/**/*.@(ts|js|vue)')

// https://github.com/lukasgeiter/gettext-extractor/issues/27
// clean file references
extractor.getMessages().forEach((msg) => {
	msg.references = []
})

extractor.savePotFile('./l10n/messages.pot')
extractor.printStats()
