
test:
	@./node_modules/.bin/mocha \
		--require should \
		--reporter spec \
		--bail \
		test/unit/*.js

.PHONY: test