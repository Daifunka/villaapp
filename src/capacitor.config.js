module.exports = {
    appId: "com.lavillastjean.villaApp",
    appName: "VillaApp",
    webDir: "dist",
    bundledWebRuntime: false,
    plugins: {
      SplashScreen: {
        launchAutoHide: true,
      },
      CapacitorUpdater: {
        autoUpdate: false
      }
    },
    assets: {
        icon: "icon.png",
        splash: "splash.png"
      }
  };
  