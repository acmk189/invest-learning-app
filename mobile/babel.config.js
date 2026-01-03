/**
 * Babel設定
 *
 * Expo/React Native環境でのトランスパイル設定
 * @see https://docs.expo.dev/versions/latest/config/babel/
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
