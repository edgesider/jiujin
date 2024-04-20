// pages/help_publish/index.ts
import rules from "../../utils/rules";
import api, { getOpenId } from "../../api/api";
import { setNeedRefresh } from "../home/index";
import { sleep } from "../../utils/other";
import Dialog from '@vant/weapp/dialog/dialog';

const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    self: null,
    // 编辑模式下正在编辑的求助，如果是新建则为null
    helpImg: [],
    helpContent: "",
    helpCurrentBountyText: '0',
    helpCurrentBounty: 0,
    editingHelp: null,
    // 按钮文案
    buttonText: '',
  },


  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await app.waitForReady();
    //获取一些全局变量
    const { self } = app.globalData;
    this.setData({
      self
    })
    // 判断为编辑还是新建求助
    const {
      isEdit = false, // 是否是编辑
      help: helpJson = null // 编辑或重新发布时，要填充的数据
    } = options;
    const help = helpJson ? JSON.parse(helpJson) : null;
    if (isEdit) {
      if (!help) {
        await wx.showToast({ icon: 'error', title: '无法编辑不存在的求助' });
        throw Error('无法编辑不存在的求助')
      }
    }
    // 将commodity的值赋给页面的变量
    const data = {
      editingHelp: isEdit ? help : null,
    };
    if (help) {
      Object.assign(data, {
        helpImg: help.img_urls,
        helpContent: help.content,
        helpCurrentBounty: help.bounty,
      });
    }
    data.buttonText = isEdit ? '保存' : '发布';
    this.setData(data);
  },
  // 表单处理
  onChangeHelpContent(event) {
    this.setData({
      helpContent: event.detail.value
    })
  },
  // 赏金失去焦点时
  onBountyInputBlur(event) {
    let bounty = parseFloat(this.data.helpCurrentBountyText) || 0;
    bounty = Math.max(Math.min(bounty, 99999.9), 0)
    this.setData({
      helpCurrentBounty: bounty,
      helpCurrentBountyText: bounty.toString(10),
    })
  },

  onChangeHelpCurrentPrice(event) {
    const text = event.detail.value;
    const valid = /^\d*(\.\d{0,2})?$/.test(text);
    this.setData({
      helpCurrentBountyText: valid ? text : this.data.helpCurrentBountyText
    })
  },
  // 添加详情图
  onUpdateHelpImg(e) {
    wx.chooseImage({
      count: 9, //默认9
      sizeType: ['compressed'], //可以指定是原图还是压缩图，默认二者都有
      success: (res) => {
        if (this.data.helpImg.length != 0) {
          this.setData({
            helpImg: this.data.helpImg.concat(res.tempFilePaths)
          })
        } else {
          this.setData({
            helpImg: res.tempFilePaths
          })
        }
      }
    });
  },
  // 预览图片
  onViewHelpImg(e) {
    wx.previewImage({
      urls: this.data.helpImg,
      current: e.currentTarget.dataset.url
    });
  },
  // 删除图片
  async onDelHelpImg(e) {
    const res = await wx.showModal({
      title: '确认删除这张照片？'
    });
    if (res.confirm) {
      this.data.helpImg.splice(e.currentTarget.dataset.index, 1);
      this.setData({
        helpImg: this.data.helpImg
      })
    }
  },

  // 验证表单格式
  checkForm(params) {
    if (!rules.required(params.content)) {
      return '请填写求助描述';
    }
    if (!rules.required(params.img_urls)) {
      return '请至少上传一张求助图片';
    }
    if (typeof params.bounty !== 'number' || params.price < 0) {
      return '无效的悬赏';
    }
    return null;
  },
  // 上传图片
  async uploadImages(paths) {
    const fileIDs = [];
    console.log("kaishi")
    for (const path of paths) {
      if (/^(cloud|http|https):\/\//.test(path) && !/http:\/\/tmp\//.test(path)) {
        fileIDs.push(path);
      } else {
        const resp = await api.uploadImage(
          path,
          `help/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
        );
        if (resp.isError) {
          console.log("1111111111111111")
          console.log(resp)
          console.log("11111111111")
          throw resp.message;
        }
        fileIDs.push(resp.data);
      }
    }
    return fileIDs;
  },


  async onSubmit() {
    const {
      editingHelp: editing,
      self,
      helpContent,
      helpCurrentBounty,
      helpImg,
    } = this.data;
    const info = editing // 编辑商品时的初始值
      ?? {
        // 新建商品时的默认值
        rid: Number(app.globalData.self.rid),
      };
    Object.assign(info, {
      // 从表单中更新
      content: helpContent,
      img_urls: helpImg,
      bounty: helpCurrentBounty
    });
    console.log("info")
    console.log(info);
    const error = this.checkForm(info);
    if (error) {
      Dialog.alert({ title: error, })
      return;
    }
    console.log(editing ? 'editing Help' : 'creating help', info);

    console.log('uploading images', info.img_urls);
    await wx.showLoading({ title: '正在上传图片', mask: true });
    try {
      console.log("1212")
      console.log(info.img_urls)
      info.img_urls = await this.uploadImages(info.img_urls);
    } catch (e) {
      console.error('upload failed', e);
      await wx.showToast({ title: '图片上传失败', mask: true, icon: 'error' });
      return;
    } finally {
      await wx.hideLoading();
    }
    console.log('uploaded images', info.img_urls);

    await wx.showLoading({
      title: editing ? '正在保存' : '正在发布',
      mask: true
    });

    const resp =
      editing
        ? await api.updateHelp(editing._id, info)
        : await api.createHelp(info);
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp);
      await wx.showToast({
        title: editing ? '保存失败' : '发布失败',
        icon: 'error',
      });
      return;
    }
    this.getOpenerEventChannel().emit(editing ? 'afterEdited' : 'afterPublished');
    if (!editing) {
      // TODO 使用Channel
      setNeedRefresh();
    }
    await wx.showToast({
      title: editing ? '已保存' : '发布成功！',
      duration: 1500, mask: true
    });

    await sleep(1500);
    await wx.navigateBack();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})