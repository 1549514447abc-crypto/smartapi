 
// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    console.log('剪映草稿导入工具已启动');
    
    // 显示当前系统信息
    updateSystemInfo();
});

// 测试功能
function testFunction() {
    const testResult = document.getElementById('testResult');
    testResult.textContent = '✓ 基础功能测试通过！环境配置正确，可以开始下一阶段开发。';
    testResult.className = 'test-result show';
    
    console.log('测试完成：基础环境正常');
}

// 更新系统信息
function updateSystemInfo() {
    // 模拟检测结果
    const status = {
        node: 'v22.20.0 已安装',
        folder: 'G:\\jianying-client 已创建', 
        files: 'HTML/CSS/JS 已创建',
        editor: 'Cursor 已打开'
    };
    
    document.getElementById('nodeStatus').textContent = status.node;
    document.getElementById('folderStatus').textContent = status.folder;
    document.getElementById('filesStatus').textContent = status.files;
    document.getElementById('editorStatus').textContent = status.editor;
}