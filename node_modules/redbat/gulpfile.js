const BABEL_CONF = {
	"presets": ["es2015", "stage-3"]
}

const gulp = require("gulp");
const concat = require("gulp-concat-js");
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");

gulp.task("js", function() {
	return gulp.src("./src/**/*.js")
		.pipe(concat({
			target: "index.js",
			entry: "./index.js"
		}))
		.pipe(babel(BABEL_CONF))
		.pipe(uglify())
		.pipe(gulp.dest("./build"));
});

gulp.task("default", ["js"]);
