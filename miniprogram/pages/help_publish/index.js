// pages/help_publish/index.ts
import rules from "../../utils/rules";
import api, { getOpenId } from "../../api/api";
import { setNeedRefresh } from "../home/index";
import { sleep, toastError } from "../../utils/other";
import { waitForAppReady } from "../../utils/globals";
import { NotifyType, requestNotifySubscribes } from "../../utils/notify";
import { ErrCode } from "../../api/ErrCode";
import { decodeOptions } from "../../utils/strings";

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
    helpCurrentBountyText: '',
    helpCurrentBounty: 0, // 赏金，单位分
    editingHelp: null,
    // 按钮文案
    buttonText: '',
  },

  async onLoad(options) {
    await waitForAppReady();
    //获取一些全局变量
    const { self } = app.globalData;
    this.setData({ self })

    options = decodeOptions(options);
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
      if ((help.img_urls.length === 0) || (help.img_urls.length === 1 && help.img_urls[0] === "")) {
        Object.assign(data, {
          helpImg: [],
        });
      } else {
        Object.assign(data, {
          helpImg: help.img_urls,
        });
      }
      Object.assign(data, {
        helpContent: help.content,
        helpCurrentBounty: help.bounty,
        helpCurrentBountyText: (help.bounty / 100).toString(10),
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
  onBountyInputBlur() {
    if (this.data.helpCurrentBountyText.length === 0) {
      // 支持空白
      this.setData({
        helpCurrentBounty: 0,
      });
      return;
    }
    let bounty = parseFloat(this.data.helpCurrentBountyText) || 0;
    bounty = Math.max(Math.min(bounty, 99999), 0)
    this.setData({
      helpCurrentBounty: bounty * 100,
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
    // if (!rules.required(params.img_urls)) {
    //   return '请至少上传一张求助图片';
    // }
    if (typeof params.bounty !== 'number' || params.price < 0) {
      return '无效的悬赏';
    }
    return null;
  },
  // 上传图片
  async uploadImages(paths) {
    const fileIDs = [];
    for (const path of paths) {
      if (/^(cloud|http|https):\/\//.test(path) && !/http:\/\/tmp\//.test(path)) {
        fileIDs.push(path);
      } else {
        const resp = await api.uploadImage(
          path,
          `help/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
        );
        if (resp.isError) {
          throw resp.message;
        }
        fileIDs.push(resp.data);
      }
    }
    return fileIDs;
  },

  async doSubmit() {
    try {
      await requestNotifySubscribes([NotifyType.HelpChat, NotifyType.Comment]);
    } catch (e) {
      console.warn('用户拒绝订阅消息');
    }
    this.onBountyInputBlur();
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
    const error = this.checkForm(info);
    if (error) {
      await wx.showToast({
        title: error,
        icon: 'error',
      })
      return;
    }
    await wx.showLoading({ title: '正在上传图片', mask: true });
    try {
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
      let err = editing ? '保存失败' : '发布失败';
      if (resp.errno === ErrCode.SecCheckError) {
        err = '内容含有违法违规内容';
      }
      toastError(err);
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

  submitting: false,
  async onSubmit() {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    try {
      await this.doSubmit();
    } catch (e) {
      toastError(this.data.editingCommodity ? '保存失败' : '发布失败');
      console.error(e);
    } finally {
      this.submitting = false;
    }
  },
})