# XiaoHongShu Post Workflow

## Default Structure

Use 5 images by default.

1. Cover
   Theme, strongest takeaway, short visual hook.
2. Problem
   What the user is struggling with and why this matters.
3. Core Points A
   Two practical points with short examples.
4. Core Points B
   Two more practical points with short examples.
5. Summary
   Who it is for, what to try first, short closing line.

## Doubao Prompt Template

```
请帮我规划一条适合发布到小红书的图文笔记。

主题：{topic}
目标读者：{audience}
风格：真实、干货、简洁、不过度营销
图片数量：5张

请输出：
1. 标题备选 5 个
2. 正文 1 篇，适合小红书
3. 5 张图片的逐页文案规划
   - 第1张：封面标题 + 副标题
   - 第2张：问题/痛点页
   - 第3张：核心信息页A
   - 第4张：核心信息页B
   - 第5张：总结页
4. 每张图对应的即梦提示词
5. 8 个相关标签

要求：
- 每张图上的文字要短，适合海报排版
- 每页只保留 1 个主标题 + 2-4 条短信息
- 视觉风格统一
- 结果尽量适合直接发布
```

## Jimeng Prompt Rules

Best-effort option:
- Ask Jimeng for poster-style images with short Chinese text.

More reliable option:
- Ask Jimeng for clean visual backgrounds.
- Overlay exact Chinese text during the publish-prep step.

Default visual direction:
- Clean tech poster
- Strong layout hierarchy
- High contrast
- Minimal clutter
- No watermark
- No random English

## Jimeng Prompt Template

```
小红书竖版海报，比例 3:4，科技感、效率工具风格，干净高级、蓝白灰主色。

页面主题：{page_theme}
主标题：{title}
副信息：{bullets}

画面要求：
- 明确的信息层级
- 卡片式排版
- 适合小红书封面/图文页
- 留出文字区域
- 图标、工作流、界面、终端、仪表盘等视觉元素
- 不要人物
- 不要水印
- 不要杂乱背景
- 不要错误拼写
```

## Publish Checklist

1. Generate 4-5 images.
2. Pick the strongest image as cover.
3. Fill title first.
4. Paste final body copy.
5. Add topic tags at the end of the body.
6. Upload images in narrative order.
7. Preview once before publish.

## Notes

- If the topic is tool-heavy, prefer “workflow + use case + takeaway”.
- If the topic is opinion-heavy, prefer “problem + judgment + evidence + recommendation”.
- If Jimeng text quality is unstable, keep the image cleaner and move exact wording into the post body.
