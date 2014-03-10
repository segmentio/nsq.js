
test:
	@./node_modules/.bin/mocha \
		--require should \
		--bail \
		--timeout 5s \
		test/unit/*.js \
		test/acceptance/*.js

.PHONY: test