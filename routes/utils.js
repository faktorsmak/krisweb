var gm = require("gm");


/**
 * Truncate a string to the given length, breaking at word boundaries and adding an elipsis
 * @param string str String to be truncated
 * @param integer limit Max length of the string
 * @return string
 */
exports.truncate = function (str, limit) {
	var bits, i;
	bits = str.split('');
	if (bits.length > limit) {
		for (i = bits.length - 1; i > -1; --i) {
			if (i > limit) {
				bits.length = i;
			}
			else if (' ' === bits[i]) {
				bits.length = i;
				break;
			}
		}
	}
	return bits.join('');
}

/**
 * resize an image
 * @param string inputPath - path to the image file to resize
 * @param string outputPath - path to where the resized image should be written
 * @param number width - max width
 * @param number height - max height
 * @param function callback
 */
exports.resizeImage = function(inputPath, outputPath, width, height, callback) {
    var mygm = gm(inputPath);
    mygm = mygm.resize(width, height);
    mygm.write(outputPath, function (err) {
        // err is null if there is no error
        callback(err);
    });
}
