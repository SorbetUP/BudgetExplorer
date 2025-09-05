.PHONY: install lint fmt test run build fetch fetch-all

install:
	npm ci

lint:
	npm run lint

fmt:
	npm run fmt

test:
	npm test

run:
	npm run dev

build:
	npm run build

# Fetch minimal core datasets (existing TS pipeline)
fetch:
	npm run fetch

# Fetch extended datasets (all-in-one script)
fetch-all:
	npm run fetch:all

