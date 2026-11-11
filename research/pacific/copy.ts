export const chinese = {
  'Pacific Listening Lab': '太平洋聆听实验室',
  'Compare the same strip in two Pacific images. Move the marker, choose a year and listen.':
    '对比两幅太平洋图像中相同相对位置的条带。移动标记、选择年份，然后聆听。',
  'Choose a globe to hear': '选择要聆听的地球图像',
  'Tropical Pacific globe': '热带太平洋地球图像',
  'Image strip': '图像条带',
  'Brightness': '亮度',
  'Note': '音符',
  'Listen to scan': '聆听扫描',
  'Hear this strip': '试听此条带',
  'Stop': '停止',
  'Volume': '音量',
  'Starting audio': '正在启动音频',
  'Playing the scan': '正在播放扫描',
  'Playing the selected strip': '正在播放选中的条带',
  'Scan complete': '扫描完成',
  'Ready to listen': '可以聆听',
  'Preparing the images': '正在读取图像',
  'The image could not be read. Reload to try again.': '无法读取图像。请重新加载后重试。',
  'Audio could not start. Try the listening control again.': '无法启动音频。请再次点击聆听按钮。',
  'Audio is ready. Press Hear this strip again.': '音频已就绪。请再次点击“试听此条带”。',
  'The scan turns pixel brightness into pitch. A higher note cannot tell you which ocean is warmer.':
    '扫描将像素亮度转换为音高。较高的音符无法说明哪一年的海洋更暖。',
  'Original NASA image and legend': 'NASA 原始图像和图例',
  'Full NASA SVS comparison with the original legend and both dates':
    'NASA 科学可视化工作室的完整对比图，包含原始图例和两个日期',
  'The NASA legend shows seven-day sea-surface temperature anomalies in °C. Red and blue indicate warmer and cooler than the reference conditions.':
    'NASA 图例显示以摄氏度为单位的七日平均海表温度异常。红色和蓝色分别表示比参考条件偏暖和偏冷。',
  'How the two panels were prepared': '两幅图像的处理方式',
  'The circular crops remove the surrounding titles and legend from the sound input. Each crop is sampled into 48 strips at the same relative positions. A strip does not identify a matching longitude or a temperature value.':
    '圆形裁切将外围标题和图例排除在声音输入之外。每幅图像在相同相对位置采样为 48 个条带。条带不代表相同经度或温度值。',
  'Original pixels kept inside each circle. Opaque black fills the corners.':
    '保留圆内原始像素，角落填充为不透明黑色。',
  'Source and crop geometry (JSON)': '来源和裁切参数（JSON）',
  'Open original image': '打开原始图像',
  'NASA Scientific Visualization Studio · Kel Elkins · NASA JPL MUR SST':
    'NASA 科学可视化工作室 · Kel Elkins · NASA JPL 多尺度超高分辨率海表温度分析',
} as const

export type Message = keyof typeof chinese
