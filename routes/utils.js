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
