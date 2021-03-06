const loaderUtils = require('loader-utils');

class AppCache {

  constructor(cache, network, fallback, settings, hash, comment) {
    this.cache = cache;
    this.network = network;
    this.fallback = fallback;
    this.settings = settings;
    this.hash = hash;
    this.comment = comment;
    this.assets = [];
  }

  addAsset(asset) {
    this.assets.push(encodeURI(asset));
  }

  size() {
    return Buffer.byteLength(this.source(), 'utf8');
  }

  getManifestBody() {
    return [
      this.assets && this.assets.length ? `${this.assets.join('\n')}\n` : null,
      this.cache && this.cache.length ? `CACHE:\n${this.cache.join('\n')}\n` : null,
      this.network && this.network.length ? `NETWORK:\n${this.network.join('\n')}\n` : null,
      this.fallback && this.fallback.length ? `FALLBACK:\n${this.fallback.join('\n')}\n` : null,
      this.settings && this.settings.length ? `SETTINGS:\n${this.settings.join('\n')}\n` : null,
    ].filter(v => v && v.length).join('\n');
  }

  source() {
    return [
      'CACHE MANIFEST',
      `# ${this.hash}`,
      this.comment || '',
      this.getManifestBody(),
    ].join('\n');
  }
}

export default class AppCachePlugin {

  static AppCache = AppCache

  constructor({
    cache,
    network = ['*'],
    fallback,
    settings,
    exclude = [],
    output = 'manifest.appcache',
    comment,
  } = {}) {
    this.cache = cache;
    this.network = network;
    this.fallback = fallback;
    this.settings = settings;
    this.output = output;
    this.comment = comment ? `# ${comment}\n` : '';

    // Convert exclusion strings to RegExp.
    this.exclude = exclude.map(exclusion => {
      if (exclusion instanceof RegExp) return exclusion;
      return new RegExp(`^${exclusion}$`);
    });
  }

  apply(compiler) {
    const {options: {output: outputOptions = {}} = {}} = compiler;
    const {publicPath = ''} = outputOptions;

    const options = loaderUtils.getOptions(this) || {};
    const context = options.context || this.rootContext || (this.options && this.options.context);

    compiler.plugin('emit', (compilation, callback) => {
      const appCache = new AppCache(this.cache, this.network, this.fallback, this.settings, compilation.hash, this.comment);
      Object.keys(compilation.assets)
        .filter(asset => !this.exclude.some(pattern => pattern.test(asset)))
        .forEach(asset => appCache.addAsset(publicPath + asset));

      const assetName = loaderUtils.interpolateName(this, this.output, {
        context,
        content: appCache.source(),
        regExp: options.regExp,
      });

      compilation.assets[assetName] = appCache;
      callback();
    });
  }
}
