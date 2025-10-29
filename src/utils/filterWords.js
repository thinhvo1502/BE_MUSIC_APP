const badWords = ["chửi", "tục", "xxx", "bậy"];

exports.cleanContent = (text) => {
  let result = text;
  badWords.forEach((word) => {
    const regex = new RegExp(word, "gi");
    result = result.replace(regex, "***");
  });
  return result;
};
