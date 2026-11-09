// Local Expo config plugin: generates a real Android AppWidget during prebuild.
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RECEIVER = '.TaskPilotWidgetProvider';
function withTaskPilotWidget(config) {
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.receiver = app.receiver || [];
    if (!app.receiver.some((r) => r.$['android:name'] === RECEIVER)) {
      app.receiver.push({
        $: {
          'android:name': RECEIVER,
          'android:exported': 'true',
          'android:label': 'TaskPilot Quick Add',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/taskpilot_widget_info',
        } }],
      });
    }
    return mod;
  });
  config = withDangerousMod(config, ['android', async (mod) => {
    const projectRoot = mod.modRequest.projectRoot;
    const packageName = mod.android?.package || 'com.anonymous.timemanagementapp';
    const androidApp = path.join(projectRoot, 'android', 'app', 'src', 'main');
    const javaDir = path.join(androidApp, 'java', ...packageName.split('.'));
    const resDir = path.join(androidApp, 'res');
    const templateDir = path.join(projectRoot, 'plugins', 'taskpilot-widget');
    const javaTemplate = fs.readFileSync(path.join(templateDir, 'TaskPilotWidgetProvider.java'), 'utf8');
    fs.mkdirSync(javaDir, { recursive: true });
    fs.writeFileSync(path.join(javaDir, 'TaskPilotWidgetProvider.java'), javaTemplate.replace('__PACKAGE__', packageName));
    for (const [folder, filename] of [
      ['layout', 'taskpilot_widget.xml'],
      ['xml', 'taskpilot_widget_info.xml'],
      ['drawable', 'taskpilot_widget_background.xml'],
    ]) {
      const target = path.join(resDir, folder);
      fs.mkdirSync(target, { recursive: true });
      fs.copyFileSync(path.join(templateDir, filename), path.join(target, filename));
    }
    return mod;
  }]);
  return config;
}
module.exports = withTaskPilotWidget;
