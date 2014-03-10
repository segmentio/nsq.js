
test:
	@./node_modules/.bin/mocha \
		--require should \
		--bail \
		test/unit/*.js \
		test/acceptance/*.js

.PHONY: test