const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to fix Agora conflicts on both iOS and Android.
 * iOS: duplicate aosl.xcframework between AgoraRtm and AgoraInfra_iOS
 * Android: duplicate libaosl.so between agora-rtm and aosl libraries
 */
const withAgoraFix = (config) => {
  // Android fix: exclude duplicate aosl from agora-rtm AND add pickFirsts as belt-and-suspenders
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // 1. Add the new Gradle 8+ packaging syntax for pickFirsts
    if (!buildGradle.includes('pickFirsts.add')) {
      buildGradle = buildGradle.replace(
        /android\s*\{/,
        `android {
    packaging {
        jniLibs {
            pickFirsts.add("**/libaosl.so")
            pickFirsts.add("**/libc++_shared.so")
        }
    }`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // iOS fix: remove duplicate aosl.xcframework from Agora RTM pod
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        return config;
      }
      
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');

      // Improved Agora Fix block with physical deletion as recommended by Agora
      // We ensure it targets all potential conflicting pods and removes from spec correctly.
      const agoraPreInstallBlock = `
  pre_install do |installer|
    # Fix Agora aosl.xcframework conflict between AgoraRtm and AgoraInfra_iOS
    installer.pod_targets.each do |pod|
      if pod.name == 'AgoraRtm' || pod.name == 'AgoraRtmKit' || pod.name == 'agora-react-native-rtm'
        puts "Fixing Agora conflict for #{pod.name}: removing aosl.xcframework"
        
        # 1. Remove from spec to prevent CocoaPods from linking it twice
        begin
          if pod.respond_to?(:spec_consumer)
            spec = pod.spec_consumer.instance_variable_get(:@spec)
            if spec && spec.attributes_hash['vendored_frameworks']
              spec.attributes_hash['vendored_frameworks'].reject! { |f| f.include?('aosl.xcframework') }
            end
          end
        rescue => e
          puts "Could not remove from spec: #{e.message}"
        end

        # 2. Physically remove the framework folder as recommended by official Agora docs
        rtm_pod_path = File.join(installer.sandbox.root, pod.name)
        aosl_xcframework_path = File.join(rtm_pod_path, 'aosl.xcframework')
        if File.exist?(aosl_xcframework_path)
          puts "Deleting aosl.xcframework from #{aosl_xcframework_path}"
          FileUtils.rm_rf(aosl_xcframework_path)
        end
      end
    end
  end
`;

      // Clean up previous attempts
      podfileContent = podfileContent.replace(/pre_install do \|installer\|[\s\S]*?# Fix Agora aosl\.xcframework conflict[\s\S]*?end\n/g, '');

      // Insert the block
      if (!podfileContent.includes('pre_install do |installer|')) {
        podfileContent = podfileContent.replace(
          /target 'TownWall' do/,
          `target 'TownWall' do\n${agoraPreInstallBlock}`
        );
      }

      // Ensure FileUtils is required
      if (!podfileContent.includes("require 'fileutils'")) {
        podfileContent = "require 'fileutils'\n" + podfileContent;
      }

      fs.writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
};

module.exports = withAgoraFix;