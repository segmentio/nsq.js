
test:
	@./node_modules/.bin/mocha \
		--require should \
		--bail \
		test/unit/*.js

.PHONY: test