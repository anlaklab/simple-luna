'use strict'
var java = require("java");
const path = require('path');

const os = require('os');
if (os.platform() == 'darwin') {
			java.options.push('-Djava.awt.headless=true');
};

// Only set asyncOptions if not already configured
if (!java.asyncOptions) {
	java.asyncOptions = {
				asyncSuffix: "Async",
				syncSuffix: "",
	};
}

// Use absolute path for JAR file to ensure correct resolution
const jarPath = path.resolve(__dirname, "aspose-slides-25.6-nodejs.jar");
console.log('🔍 [DEBUG] Aspose JAR path:', jarPath);
console.log('🔍 [DEBUG] JAR exists:', require('fs').existsSync(jarPath));

java.classpath.push(jarPath);

exports = module.exports;

function __typeof__(objClass) {
			if (objClass != undefined && objClass.constructor) {
        var strFun = objClass.constructor.toString();
        var className = strFun.substr(0, strFun.indexOf('('));
        className = className.replace('function', '');
        return className.replace(/(^\s*)|(\s*$)/ig, '');
    }
    return typeof(objClass);
};

exports.readDataFromStream = function(readStream, callback) {
			var inputStreamBuffer = new exports.StreamBuffer();
			readStream.on('data', function(chunk) {
				inputStreamBuffer.write(chunk);
			});
			readStream.on('end', function() {
				callback(inputStreamBuffer.toInputStream());
			});
};

exports.readBytesFromStream = function(readStream, callback) {
			var inputStreamBuffer = new exports.StreamBuffer();
			readStream.on('data', function(chunk) {
				inputStreamBuffer.write(chunk);
			});
			readStream.on('end', function() {
				var array = Array.from(inputStreamBuffer.toByteArray());
        var javaArray = java.newArray('byte', array);
				callback(javaArray);
			});
};

exports.StreamBuffer = class StreamBuffer {
			constructor() {
				var self = java.newInstanceSync("com.aspose.slides.StreamBuffer");

				self.write = function(chunk) {
					var array = Array.from(chunk);
					var javaArray = java.newArray('byte', array);
					self.__proto__.write.call(self, javaArray, 0, javaArray.length);
				}
				return self;
			}
};
exports.AdjustValue = java.import("com.aspose.slides.AdjustValue");
exports.AdjustValueCollection = java.import("com.aspose.slides.AdjustValueCollection");
exports.AfterAnimationType = java.import("com.aspose.slides.AfterAnimationType");
exports.AlphaBiLevel = java.import("com.aspose.slides.AlphaBiLevel");
exports.AlphaCeiling = java.import("com.aspose.slides.AlphaCeiling");
exports.AlphaFloor = java.import("com.aspose.slides.AlphaFloor");
exports.AlphaInverse = java.import("com.aspose.slides.AlphaInverse");
exports.AlphaModulate = java.import("com.aspose.slides.AlphaModulate");
exports.AlphaModulateFixed = java.import("com.aspose.slides.AlphaModulateFixed");
exports.AlphaReplace = java.import("com.aspose.slides.AlphaReplace");
exports.AnimateTextType = java.import("com.aspose.slides.AnimateTextType");
exports.AnimationTimeLine = java.import("com.aspose.slides.AnimationTimeLine");
exports.AsposeLicenseException = java.import("com.aspose.slides.AsposeLicenseException");
exports.Audio = java.import("com.aspose.slides.Audio");
exports.AudioCollection = java.import("com.aspose.slides.AudioCollection");
exports.AudioCollection.addAudioFromStream = function(audiocollection, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = audiocollection.addAudio(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = audiocollection.addAudio(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.AudioFrame = java.import("com.aspose.slides.AudioFrame");
exports.AudioPlayModePreset = java.import("com.aspose.slides.AudioPlayModePreset");
exports.AudioVolumeMode = java.import("com.aspose.slides.AudioVolumeMode");
exports.AutoShape = java.import("com.aspose.slides.AutoShape");
exports.AutoShapeLock = java.import("com.aspose.slides.AutoShapeLock");
exports.AxesCompositionNotCombinableException = java.import("com.aspose.slides.AxesCompositionNotCombinableException");
exports.AxesManager = java.import("com.aspose.slides.AxesManager");
exports.Axis = java.import("com.aspose.slides.Axis");
exports.AxisAggregationType = java.import("com.aspose.slides.AxisAggregationType");
exports.AxisFormat = java.import("com.aspose.slides.AxisFormat");
exports.AxisPositionType = java.import("com.aspose.slides.AxisPositionType");
exports.Backdrop3DScene = java.import("com.aspose.slides.Backdrop3DScene");
exports.Background = java.import("com.aspose.slides.Background");
exports.BackgroundType = java.import("com.aspose.slides.BackgroundType");
exports.BaseChartValue = java.import("com.aspose.slides.BaseChartValue");
exports.BaseHandoutNotesSlideHeaderFooterManager = java.import("com.aspose.slides.BaseHandoutNotesSlideHeaderFooterManager");
exports.BaseHeaderFooterManager = java.import("com.aspose.slides.BaseHeaderFooterManager");
exports.BaseOverrideThemeManager = java.import("com.aspose.slides.BaseOverrideThemeManager");
exports.BasePortionFormat = java.import("com.aspose.slides.BasePortionFormat");
exports.BaseScript = java.import("com.aspose.slides.BaseScript");
exports.BaseShapeLock = java.import("com.aspose.slides.BaseShapeLock");
exports.BaseSlide = java.import("com.aspose.slides.BaseSlide");
exports.BaseSlideHeaderFooterManager = java.import("com.aspose.slides.BaseSlideHeaderFooterManager");
exports.BaseThemeManager = java.import("com.aspose.slides.BaseThemeManager");
exports.Behavior = java.import("com.aspose.slides.Behavior");
exports.BehaviorAccumulateType = java.import("com.aspose.slides.BehaviorAccumulateType");
exports.BehaviorAdditiveType = java.import("com.aspose.slides.BehaviorAdditiveType");
exports.BehaviorCollection = java.import("com.aspose.slides.BehaviorCollection");
exports.BehaviorFactory = java.import("com.aspose.slides.BehaviorFactory");
exports.BehaviorProperty = java.import("com.aspose.slides.BehaviorProperty");
exports.BehaviorPropertyCollection = java.import("com.aspose.slides.BehaviorPropertyCollection");
exports.BevelPresetType = java.import("com.aspose.slides.BevelPresetType");
exports.BiLevel = java.import("com.aspose.slides.BiLevel");
exports.BlackWhiteConversionMode = java.import("com.aspose.slides.BlackWhiteConversionMode");
exports.BlackWhiteMode = java.import("com.aspose.slides.BlackWhiteMode");
exports.BlobManagementOptions = java.import("com.aspose.slides.BlobManagementOptions");
exports.Blur = java.import("com.aspose.slides.Blur");
exports.BrowsedAtKiosk = java.import("com.aspose.slides.BrowsedAtKiosk");
exports.BrowsedByIndividual = java.import("com.aspose.slides.BrowsedByIndividual");
exports.BubbleSizeRepresentationType = java.import("com.aspose.slides.BubbleSizeRepresentationType");
exports.BuildType = java.import("com.aspose.slides.BuildType");
exports.BulletFormat = java.import("com.aspose.slides.BulletFormat");
exports.BulletType = java.import("com.aspose.slides.BulletType");
exports.Camera = java.import("com.aspose.slides.Camera");
exports.CameraPresetType = java.import("com.aspose.slides.CameraPresetType");
exports.CannotCombine2DAnd3DChartsException = java.import("com.aspose.slides.CannotCombine2DAnd3DChartsException");
exports.Captions = java.import("com.aspose.slides.Captions");
exports.CaptionsCollection = java.import("com.aspose.slides.CaptionsCollection");
exports.CaptionsCollection.addFromStream = function(captionscollection, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg1) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg1.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg1.on('end', function() {
		var item;
		var error;
		try {
			item = captionscollection.add(arg0, inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.CategoryAxisType = java.import("com.aspose.slides.CategoryAxisType");
exports.Cell = java.import("com.aspose.slides.Cell");
exports.CellCircularReferenceException = java.import("com.aspose.slides.CellCircularReferenceException");
exports.CellCollection = java.import("com.aspose.slides.CellCollection");
exports.CellFormat = java.import("com.aspose.slides.CellFormat");
exports.CellInvalidFormulaException = java.import("com.aspose.slides.CellInvalidFormulaException");
exports.CellInvalidReferenceException = java.import("com.aspose.slides.CellInvalidReferenceException");
exports.CellUnsupportedDataException = java.import("com.aspose.slides.CellUnsupportedDataException");
exports.Chart = java.import("com.aspose.slides.Chart");
exports.ChartCategory = java.import("com.aspose.slides.ChartCategory");
exports.ChartCategoryCollection = java.import("com.aspose.slides.ChartCategoryCollection");
exports.ChartCategoryLevelsManager = java.import("com.aspose.slides.ChartCategoryLevelsManager");
exports.ChartCellCollection = java.import("com.aspose.slides.ChartCellCollection");
exports.ChartData = java.import("com.aspose.slides.ChartData");
exports.ChartDataCell = java.import("com.aspose.slides.ChartDataCell");
exports.ChartDataPoint = java.import("com.aspose.slides.ChartDataPoint");
exports.ChartDataPointCollection = java.import("com.aspose.slides.ChartDataPointCollection");
exports.ChartDataPointLevel = java.import("com.aspose.slides.ChartDataPointLevel");
exports.ChartDataPointLevelsManager = java.import("com.aspose.slides.ChartDataPointLevelsManager");
exports.ChartDataSourceType = java.import("com.aspose.slides.ChartDataSourceType");
exports.ChartDataWorkbook = java.import("com.aspose.slides.ChartDataWorkbook");
exports.ChartDataWorksheet = java.import("com.aspose.slides.ChartDataWorksheet");
exports.ChartDataWorksheetCollection = java.import("com.aspose.slides.ChartDataWorksheetCollection");
exports.ChartLinesFormat = java.import("com.aspose.slides.ChartLinesFormat");
exports.ChartPlotArea = java.import("com.aspose.slides.ChartPlotArea");
exports.ChartPortionFormat = java.import("com.aspose.slides.ChartPortionFormat");
exports.ChartSeries = java.import("com.aspose.slides.ChartSeries");
exports.ChartSeriesCollection = java.import("com.aspose.slides.ChartSeriesCollection");
exports.ChartSeriesGroup = java.import("com.aspose.slides.ChartSeriesGroup");
exports.ChartShapeType = java.import("com.aspose.slides.ChartShapeType");
exports.ChartTextFormat = java.import("com.aspose.slides.ChartTextFormat");
exports.ChartThemeManager = java.import("com.aspose.slides.ChartThemeManager");
exports.ChartTitle = java.import("com.aspose.slides.ChartTitle");
exports.ChartType = java.import("com.aspose.slides.ChartType");
exports.ChartTypeCharacterizer = java.import("com.aspose.slides.ChartTypeCharacterizer");
exports.ChartWall = java.import("com.aspose.slides.ChartWall");
exports.Collect = java.import("com.aspose.slides.Collect");
exports.ColorChange = java.import("com.aspose.slides.ColorChange");
exports.ColorDirection = java.import("com.aspose.slides.ColorDirection");
exports.ColorEffect = java.import("com.aspose.slides.ColorEffect");
exports.ColorFormat = java.import("com.aspose.slides.ColorFormat");
exports.ColorOffset = java.import("com.aspose.slides.ColorOffset");
exports.ColorOperation = java.import("com.aspose.slides.ColorOperation");
exports.ColorOperationCollection = java.import("com.aspose.slides.ColorOperationCollection");
exports.ColorReplace = java.import("com.aspose.slides.ColorReplace");
exports.ColorScheme = java.import("com.aspose.slides.ColorScheme");
exports.ColorSchemeIndex = java.import("com.aspose.slides.ColorSchemeIndex");
exports.ColorSpace = java.import("com.aspose.slides.ColorSpace");
exports.ColorStringFormat = java.import("com.aspose.slides.ColorStringFormat");
exports.ColorTransformOperation = java.import("com.aspose.slides.ColorTransformOperation");
exports.ColorType = java.import("com.aspose.slides.ColorType");
exports.Column = java.import("com.aspose.slides.Column");
exports.ColumnCollection = java.import("com.aspose.slides.ColumnCollection");
exports.ColumnFormat = java.import("com.aspose.slides.ColumnFormat");
exports.CombinableSeriesTypesGroup = java.import("com.aspose.slides.CombinableSeriesTypesGroup");
exports.CommandEffect = java.import("com.aspose.slides.CommandEffect");
exports.CommandEffectType = java.import("com.aspose.slides.CommandEffectType");
exports.Comment = java.import("com.aspose.slides.Comment");
exports.CommentAuthor = java.import("com.aspose.slides.CommentAuthor");
exports.CommentAuthorCollection = java.import("com.aspose.slides.CommentAuthorCollection");
exports.CommentCollection = java.import("com.aspose.slides.CommentCollection");
exports.CommentsPositions = java.import("com.aspose.slides.CommentsPositions");
exports.CommonSlideViewProperties = java.import("com.aspose.slides.CommonSlideViewProperties");
exports.Compress = java.import("com.aspose.slides.Compress");
exports.Conformance = java.import("com.aspose.slides.Conformance");
exports.Connector = java.import("com.aspose.slides.Connector");
exports.ConnectorLock = java.import("com.aspose.slides.ConnectorLock");
exports.Control = java.import("com.aspose.slides.Control");
exports.ControlCollection = java.import("com.aspose.slides.ControlCollection");
exports.ControlPropertiesCollection = java.import("com.aspose.slides.ControlPropertiesCollection");
exports.ControlType = java.import("com.aspose.slides.ControlType");
exports.Convert = java.import("com.aspose.slides.Convert");
exports.CornerDirectionTransition = java.import("com.aspose.slides.CornerDirectionTransition");
exports.CrossesType = java.import("com.aspose.slides.CrossesType");
exports.CurrentThreadSettings = java.import("com.aspose.slides.CurrentThreadSettings");
exports.CustomData = java.import("com.aspose.slides.CustomData");
exports.CustomXmlPart = java.import("com.aspose.slides.CustomXmlPart");
exports.CustomXmlPartCollection = java.import("com.aspose.slides.CustomXmlPartCollection");
exports.CustomXmlPartCollection.addFromStream = function(customxmlpartcollection, arg0, arg1) {
if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = customxmlpartcollection.add(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.DataLabel = java.import("com.aspose.slides.DataLabel");
exports.DataLabelCollection = java.import("com.aspose.slides.DataLabelCollection");
exports.DataLabelFormat = java.import("com.aspose.slides.DataLabelFormat");
exports.DataSourceType = java.import("com.aspose.slides.DataSourceType");
exports.DataSourceTypeForErrorBarsCustomValues = java.import("com.aspose.slides.DataSourceTypeForErrorBarsCustomValues");
exports.DataTable = java.import("com.aspose.slides.DataTable");
exports.DigitalSignature = java.import("com.aspose.slides.DigitalSignature");
exports.DigitalSignatureCollection = java.import("com.aspose.slides.DigitalSignatureCollection");
exports.DisplayBlanksAsType = java.import("com.aspose.slides.DisplayBlanksAsType");
exports.DisplayUnitType = java.import("com.aspose.slides.DisplayUnitType");
exports.DocumentProperties = java.import("com.aspose.slides.DocumentProperties");
exports.DomObject = java.import("com.aspose.slides.DomObject");
exports.DoubleChartValue = java.import("com.aspose.slides.DoubleChartValue");
exports.DrawingGuide = java.import("com.aspose.slides.DrawingGuide");
exports.DrawingGuidesCollection = java.import("com.aspose.slides.DrawingGuidesCollection");
exports.Duotone = java.import("com.aspose.slides.Duotone");
exports.Effect = java.import("com.aspose.slides.Effect");
exports.EffectChartMajorGroupingType = java.import("com.aspose.slides.EffectChartMajorGroupingType");
exports.EffectChartMinorGroupingType = java.import("com.aspose.slides.EffectChartMinorGroupingType");
exports.EffectFactory = java.import("com.aspose.slides.EffectFactory");
exports.EffectFillType = java.import("com.aspose.slides.EffectFillType");
exports.EffectFormat = java.import("com.aspose.slides.EffectFormat");
exports.EffectPresetClassType = java.import("com.aspose.slides.EffectPresetClassType");
exports.EffectRestartType = java.import("com.aspose.slides.EffectRestartType");
exports.EffectStyle = java.import("com.aspose.slides.EffectStyle");
exports.EffectStyleCollection = java.import("com.aspose.slides.EffectStyleCollection");
exports.EffectSubtype = java.import("com.aspose.slides.EffectSubtype");
exports.EffectTriggerType = java.import("com.aspose.slides.EffectTriggerType");
exports.EffectType = java.import("com.aspose.slides.EffectType");
exports.EightDirectionTransition = java.import("com.aspose.slides.EightDirectionTransition");
exports.EmbedAllFontsHtmlController = java.import("com.aspose.slides.EmbedAllFontsHtmlController");
exports.EmbedFontCharacters = java.import("com.aspose.slides.EmbedFontCharacters");
exports.EmbeddedEotFontsHtmlController = java.import("com.aspose.slides.EmbeddedEotFontsHtmlController");
exports.EmbeddedWoffFontsHtmlController = java.import("com.aspose.slides.EmbeddedWoffFontsHtmlController");
exports.EmbeddingLevel = java.import("com.aspose.slides.EmbeddingLevel");
exports.EmptyTransition = java.import("com.aspose.slides.EmptyTransition");
exports.ErrorBarType = java.import("com.aspose.slides.ErrorBarType");
exports.ErrorBarValueType = java.import("com.aspose.slides.ErrorBarValueType");
exports.ErrorBarsCustomValues = java.import("com.aspose.slides.ErrorBarsCustomValues");
exports.ErrorBarsFormat = java.import("com.aspose.slides.ErrorBarsFormat");
exports.ExternalResourceResolver = java.import("com.aspose.slides.ExternalResourceResolver");
exports.ExtraColorScheme = java.import("com.aspose.slides.ExtraColorScheme");
exports.ExtraColorSchemeCollection = java.import("com.aspose.slides.ExtraColorSchemeCollection");
exports.Field = java.import("com.aspose.slides.Field");
exports.FieldType = java.import("com.aspose.slides.FieldType");
exports.FillBlendMode = java.import("com.aspose.slides.FillBlendMode");
exports.FillFormat = java.import("com.aspose.slides.FillFormat");
exports.FillFormatCollection = java.import("com.aspose.slides.FillFormatCollection");
exports.FillOverlay = java.import("com.aspose.slides.FillOverlay");
exports.FillType = java.import("com.aspose.slides.FillType");
exports.FilterEffect = java.import("com.aspose.slides.FilterEffect");
exports.FilterEffectRevealType = java.import("com.aspose.slides.FilterEffectRevealType");
exports.FilterEffectSubtype = java.import("com.aspose.slides.FilterEffectSubtype");
exports.FilterEffectType = java.import("com.aspose.slides.FilterEffectType");
exports.Flavor = java.import("com.aspose.slides.Flavor");
exports.FlyThroughTransition = java.import("com.aspose.slides.FlyThroughTransition");
exports.FontAlignment = java.import("com.aspose.slides.FontAlignment");
exports.FontCollectionIndex = java.import("com.aspose.slides.FontCollectionIndex");
exports.FontData = java.import("com.aspose.slides.FontData");
exports.FontDataFactory = java.import("com.aspose.slides.FontDataFactory");
exports.FontFallBackRule = java.import("com.aspose.slides.FontFallBackRule");
exports.FontFallBackRulesCollection = java.import("com.aspose.slides.FontFallBackRulesCollection");
exports.FontScheme = java.import("com.aspose.slides.FontScheme");
exports.FontSources = java.import("com.aspose.slides.FontSources");
exports.FontStyle = java.import("com.aspose.slides.FontStyle");
exports.FontSubstCondition = java.import("com.aspose.slides.FontSubstCondition");
exports.FontSubstRule = java.import("com.aspose.slides.FontSubstRule");
exports.FontSubstRuleCollection = java.import("com.aspose.slides.FontSubstRuleCollection");
exports.FontSubstitutionInfo = java.import("com.aspose.slides.FontSubstitutionInfo");
exports.Fonts = java.import("com.aspose.slides.Fonts");
exports.FontsLoader = java.import("com.aspose.slides.FontsLoader");
exports.FontsManager = java.import("com.aspose.slides.FontsManager");
exports.ForEach = java.import("com.aspose.slides.ForEach");
exports.Format = java.import("com.aspose.slides.Format");
exports.FormatFactory = java.import("com.aspose.slides.FormatFactory");
exports.FormatScheme = java.import("com.aspose.slides.FormatScheme");
exports.FrameTickEventArgs = java.import("com.aspose.slides.FrameTickEventArgs");
exports.GeometryPath = java.import("com.aspose.slides.GeometryPath");
exports.GeometryShape = java.import("com.aspose.slides.GeometryShape");
exports.GifOptions = java.import("com.aspose.slides.GifOptions");
exports.GlitterTransition = java.import("com.aspose.slides.GlitterTransition");
exports.GlobalLayoutSlideCollection = java.import("com.aspose.slides.GlobalLayoutSlideCollection");
exports.Glow = java.import("com.aspose.slides.Glow");
exports.GradientDirection = java.import("com.aspose.slides.GradientDirection");
exports.GradientFormat = java.import("com.aspose.slides.GradientFormat");
exports.GradientShape = java.import("com.aspose.slides.GradientShape");
exports.GradientStop = java.import("com.aspose.slides.GradientStop");
exports.GradientStopCollection = java.import("com.aspose.slides.GradientStopCollection");
exports.GradientStopCollectionEffectiveData = java.import("com.aspose.slides.GradientStopCollectionEffectiveData");
exports.GradientStopEffectiveData = java.import("com.aspose.slides.GradientStopEffectiveData");
exports.GradientStyle = java.import("com.aspose.slides.GradientStyle");
exports.GraphicalObject = java.import("com.aspose.slides.GraphicalObject");
exports.GraphicalObjectLock = java.import("com.aspose.slides.GraphicalObjectLock");
exports.GrayScale = java.import("com.aspose.slides.GrayScale");
exports.GroupShape = java.import("com.aspose.slides.GroupShape");
exports.GroupShapeLock = java.import("com.aspose.slides.GroupShapeLock");
exports.HSL = java.import("com.aspose.slides.HSL");
exports.HandleRepeatedSpaces = java.import("com.aspose.slides.HandleRepeatedSpaces");
exports.HandoutLayoutingOptions = java.import("com.aspose.slides.HandoutLayoutingOptions");
exports.HandoutType = java.import("com.aspose.slides.HandoutType");
exports.HeadingPair = java.import("com.aspose.slides.HeadingPair");
exports.Html5Options = java.import("com.aspose.slides.Html5Options");
exports.HtmlExternalResolver = java.import("com.aspose.slides.HtmlExternalResolver");
exports.HtmlFormatter = java.import("com.aspose.slides.HtmlFormatter");
exports.HtmlGenerator = java.import("com.aspose.slides.HtmlGenerator");
exports.HtmlOptions = java.import("com.aspose.slides.HtmlOptions");
exports.Hyperlink = java.import("com.aspose.slides.Hyperlink");
exports.HyperlinkActionType = java.import("com.aspose.slides.HyperlinkActionType");
exports.HyperlinkColorSource = java.import("com.aspose.slides.HyperlinkColorSource");
exports.HyperlinkManager = java.import("com.aspose.slides.HyperlinkManager");
exports.HyperlinkQueries = java.import("com.aspose.slides.HyperlinkQueries");
exports.ImageCollection = java.import("com.aspose.slides.ImageCollection");
exports.ImageCollection.addImageFromStream = function(imagecollection, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = imagecollection.addImage(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = imagecollection.addImage(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.ImageFormat = java.import("com.aspose.slides.ImageFormat");
exports.ImagePixelFormat = java.import("com.aspose.slides.ImagePixelFormat");
exports.ImageTransformOCollectionEffectiveData = java.import("com.aspose.slides.ImageTransformOCollectionEffectiveData");
exports.ImageTransformOperation = java.import("com.aspose.slides.ImageTransformOperation");
exports.ImageTransformOperationCollection = java.import("com.aspose.slides.ImageTransformOperationCollection");
exports.ImageTransformOperationFactory = java.import("com.aspose.slides.ImageTransformOperationFactory");
exports.Images = java.import("com.aspose.slides.Images");
exports.Images.fromStreamFromStream = function(arg0, arg1) {
if (arguments.length == 2 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = exports.Images.fromStream(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.InOutTransition = java.import("com.aspose.slides.InOutTransition");
exports.Ink = java.import("com.aspose.slides.Ink");
exports.InkActions = java.import("com.aspose.slides.InkActions");
exports.InkBrush = java.import("com.aspose.slides.InkBrush");
exports.InkOptions = java.import("com.aspose.slides.InkOptions");
exports.InkTrace = java.import("com.aspose.slides.InkTrace");
exports.InnerShadow = java.import("com.aspose.slides.InnerShadow");
exports.Input = java.import("com.aspose.slides.Input");
exports.InterruptionToken = java.import("com.aspose.slides.InterruptionToken");
exports.InterruptionTokenSource = java.import("com.aspose.slides.InterruptionTokenSource");
exports.InvalidPasswordException = java.import("com.aspose.slides.InvalidPasswordException");
exports.LayoutPlaceholderManager = java.import("com.aspose.slides.LayoutPlaceholderManager");
exports.LayoutSlide = java.import("com.aspose.slides.LayoutSlide");
exports.LayoutSlideCollection = java.import("com.aspose.slides.LayoutSlideCollection");
exports.LayoutSlideHeaderFooterManager = java.import("com.aspose.slides.LayoutSlideHeaderFooterManager");
exports.LayoutSlideThemeManager = java.import("com.aspose.slides.LayoutSlideThemeManager");
exports.LayoutTargetType = java.import("com.aspose.slides.LayoutTargetType");
exports.LeftRightDirectionTransition = java.import("com.aspose.slides.LeftRightDirectionTransition");
exports.LegacyDiagram = java.import("com.aspose.slides.LegacyDiagram");
exports.Legend = java.import("com.aspose.slides.Legend");
exports.LegendDataLabelPosition = java.import("com.aspose.slides.LegendDataLabelPosition");
exports.LegendEntryCollection = java.import("com.aspose.slides.LegendEntryCollection");
exports.LegendEntryProperties = java.import("com.aspose.slides.LegendEntryProperties");
exports.LegendPositionType = java.import("com.aspose.slides.LegendPositionType");
exports.License = java.import("com.aspose.slides.License");
exports.License.setLicenseFromStream = function(license, arg0, arg1) {
if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = license.setLicense(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.LightRig = java.import("com.aspose.slides.LightRig");
exports.LightRigPresetType = java.import("com.aspose.slides.LightRigPresetType");
exports.LightingDirection = java.import("com.aspose.slides.LightingDirection");
exports.LineAlignment = java.import("com.aspose.slides.LineAlignment");
exports.LineArrowheadLength = java.import("com.aspose.slides.LineArrowheadLength");
exports.LineArrowheadStyle = java.import("com.aspose.slides.LineArrowheadStyle");
exports.LineArrowheadWidth = java.import("com.aspose.slides.LineArrowheadWidth");
exports.LineCapStyle = java.import("com.aspose.slides.LineCapStyle");
exports.LineDashStyle = java.import("com.aspose.slides.LineDashStyle");
exports.LineFillFormat = java.import("com.aspose.slides.LineFillFormat");
exports.LineFormat = java.import("com.aspose.slides.LineFormat");
exports.LineFormatCollection = java.import("com.aspose.slides.LineFormatCollection");
exports.LineJoinStyle = java.import("com.aspose.slides.LineJoinStyle");
exports.LineSketchType = java.import("com.aspose.slides.LineSketchType");
exports.LineStyle = java.import("com.aspose.slides.LineStyle");
exports.LinkEmbedDecision = java.import("com.aspose.slides.LinkEmbedDecision");
exports.LoadFormat = java.import("com.aspose.slides.LoadFormat");
exports.LoadOptions = java.import("com.aspose.slides.LoadOptions");
exports.LoadingStreamBehavior = java.import("com.aspose.slides.LoadingStreamBehavior");
exports.Luminance = java.import("com.aspose.slides.Luminance");
exports.MarkdownExportType = java.import("com.aspose.slides.MarkdownExportType");
exports.MarkdownSaveOptions = java.import("com.aspose.slides.MarkdownSaveOptions");
exports.Marker = java.import("com.aspose.slides.Marker");
exports.MarkerStyleType = java.import("com.aspose.slides.MarkerStyleType");
exports.MasterHandoutSlide = java.import("com.aspose.slides.MasterHandoutSlide");
exports.MasterHandoutSlideHeaderFooterManager = java.import("com.aspose.slides.MasterHandoutSlideHeaderFooterManager");
exports.MasterLayoutSlideCollection = java.import("com.aspose.slides.MasterLayoutSlideCollection");
exports.MasterNotesSlide = java.import("com.aspose.slides.MasterNotesSlide");
exports.MasterNotesSlideHeaderFooterManager = java.import("com.aspose.slides.MasterNotesSlideHeaderFooterManager");
exports.MasterSlide = java.import("com.aspose.slides.MasterSlide");
exports.MasterSlideCollection = java.import("com.aspose.slides.MasterSlideCollection");
exports.MasterSlideHeaderFooterManager = java.import("com.aspose.slides.MasterSlideHeaderFooterManager");
exports.MasterTheme = java.import("com.aspose.slides.MasterTheme");
exports.MasterThemeManager = java.import("com.aspose.slides.MasterThemeManager");
exports.MaterialPresetType = java.import("com.aspose.slides.MaterialPresetType");
exports.MathAccent = java.import("com.aspose.slides.MathAccent");
exports.MathAccentFactory = java.import("com.aspose.slides.MathAccentFactory");
exports.MathArray = java.import("com.aspose.slides.MathArray");
exports.MathArrayFactory = java.import("com.aspose.slides.MathArrayFactory");
exports.MathBar = java.import("com.aspose.slides.MathBar");
exports.MathBarFactory = java.import("com.aspose.slides.MathBarFactory");
exports.MathBlock = java.import("com.aspose.slides.MathBlock");
exports.MathBlock.writeAsMathMlToStream = function(mathblock, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	mathblock.writeAsMathMl(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.MathBlockFactory = java.import("com.aspose.slides.MathBlockFactory");
exports.MathBorderBox = java.import("com.aspose.slides.MathBorderBox");
exports.MathBorderBoxFactory = java.import("com.aspose.slides.MathBorderBoxFactory");
exports.MathBox = java.import("com.aspose.slides.MathBox");
exports.MathBoxFactory = java.import("com.aspose.slides.MathBoxFactory");
exports.MathDelimiter = java.import("com.aspose.slides.MathDelimiter");
exports.MathDelimiterFactory = java.import("com.aspose.slides.MathDelimiterFactory");
exports.MathDelimiterShape = java.import("com.aspose.slides.MathDelimiterShape");
exports.MathElementBase = java.import("com.aspose.slides.MathElementBase");
exports.MathFraction = java.import("com.aspose.slides.MathFraction");
exports.MathFractionFactory = java.import("com.aspose.slides.MathFractionFactory");
exports.MathFractionTypes = java.import("com.aspose.slides.MathFractionTypes");
exports.MathFunction = java.import("com.aspose.slides.MathFunction");
exports.MathFunctionFactory = java.import("com.aspose.slides.MathFunctionFactory");
exports.MathFunctionsOfOneArgument = java.import("com.aspose.slides.MathFunctionsOfOneArgument");
exports.MathFunctionsOfTwoArguments = java.import("com.aspose.slides.MathFunctionsOfTwoArguments");
exports.MathGroupingCharacter = java.import("com.aspose.slides.MathGroupingCharacter");
exports.MathGroupingCharacterFactory = java.import("com.aspose.slides.MathGroupingCharacterFactory");
exports.MathHorizontalAlignment = java.import("com.aspose.slides.MathHorizontalAlignment");
exports.MathIntegralTypes = java.import("com.aspose.slides.MathIntegralTypes");
exports.MathJustification = java.import("com.aspose.slides.MathJustification");
exports.MathLeftSubSuperscriptElement = java.import("com.aspose.slides.MathLeftSubSuperscriptElement");
exports.MathLimit = java.import("com.aspose.slides.MathLimit");
exports.MathLimitFactory = java.import("com.aspose.slides.MathLimitFactory");
exports.MathLimitLocations = java.import("com.aspose.slides.MathLimitLocations");
exports.MathMatrix = java.import("com.aspose.slides.MathMatrix");
exports.MathMatrixFactory = java.import("com.aspose.slides.MathMatrixFactory");
exports.MathNaryOperator = java.import("com.aspose.slides.MathNaryOperator");
exports.MathNaryOperatorFactory = java.import("com.aspose.slides.MathNaryOperatorFactory");
exports.MathNaryOperatorTypes = java.import("com.aspose.slides.MathNaryOperatorTypes");
exports.MathParagraph = java.import("com.aspose.slides.MathParagraph");
exports.MathParagraph.writeAsMathMlToStream = function(mathparagraph, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	mathparagraph.writeAsMathMl(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.MathParagraphFactory = java.import("com.aspose.slides.MathParagraphFactory");
exports.MathPortion = java.import("com.aspose.slides.MathPortion");
exports.MathRadical = java.import("com.aspose.slides.MathRadical");
exports.MathRadicalFactory = java.import("com.aspose.slides.MathRadicalFactory");
exports.MathRightSubSuperscriptElement = java.import("com.aspose.slides.MathRightSubSuperscriptElement");
exports.MathRightSubSuperscriptElementFactory = java.import("com.aspose.slides.MathRightSubSuperscriptElementFactory");
exports.MathRowSpacingRule = java.import("com.aspose.slides.MathRowSpacingRule");
exports.MathSpacingRules = java.import("com.aspose.slides.MathSpacingRules");
exports.MathSubscriptElement = java.import("com.aspose.slides.MathSubscriptElement");
exports.MathSubscriptElementFactory = java.import("com.aspose.slides.MathSubscriptElementFactory");
exports.MathSuperscriptElement = java.import("com.aspose.slides.MathSuperscriptElement");
exports.MathSuperscriptElementFactory = java.import("com.aspose.slides.MathSuperscriptElementFactory");
exports.MathTopBotPositions = java.import("com.aspose.slides.MathTopBotPositions");
exports.MathVerticalAlignment = java.import("com.aspose.slides.MathVerticalAlignment");
exports.MathematicalText = java.import("com.aspose.slides.MathematicalText");
exports.MathematicalTextFactory = java.import("com.aspose.slides.MathematicalTextFactory");
exports.Metered = java.import("com.aspose.slides.Metered");
exports.ModernComment = java.import("com.aspose.slides.ModernComment");
exports.ModernCommentStatus = java.import("com.aspose.slides.ModernCommentStatus");
exports.MorphTransition = java.import("com.aspose.slides.MorphTransition");
exports.MotionCmdPath = java.import("com.aspose.slides.MotionCmdPath");
exports.MotionCommandPathType = java.import("com.aspose.slides.MotionCommandPathType");
exports.MotionEffect = java.import("com.aspose.slides.MotionEffect");
exports.MotionOriginType = java.import("com.aspose.slides.MotionOriginType");
exports.MotionPath = java.import("com.aspose.slides.MotionPath");
exports.MotionPathEditMode = java.import("com.aspose.slides.MotionPathEditMode");
exports.MotionPathPointsType = java.import("com.aspose.slides.MotionPathPointsType");
exports.NewLineType = java.import("com.aspose.slides.NewLineType");
exports.NormalViewProperties = java.import("com.aspose.slides.NormalViewProperties");
exports.NormalViewRestoredProperties = java.import("com.aspose.slides.NormalViewRestoredProperties");
exports.NotesCommentsLayoutingOptions = java.import("com.aspose.slides.NotesCommentsLayoutingOptions");
exports.NotesPositions = java.import("com.aspose.slides.NotesPositions");
exports.NotesSize = java.import("com.aspose.slides.NotesSize");
exports.NotesSlide = java.import("com.aspose.slides.NotesSlide");
exports.NotesSlideHeaderFooterManager = java.import("com.aspose.slides.NotesSlideHeaderFooterManager");
exports.NotesSlideManager = java.import("com.aspose.slides.NotesSlideManager");
exports.NotesSlideThemeManager = java.import("com.aspose.slides.NotesSlideThemeManager");
exports.NullableBool = java.import("com.aspose.slides.NullableBool");
exports.NumberedBulletStyle = java.import("com.aspose.slides.NumberedBulletStyle");
exports.OOXMLCorruptFileException = java.import("com.aspose.slides.OOXMLCorruptFileException");
exports.OOXMLException = java.import("com.aspose.slides.OOXMLException");
exports.OdpException = java.import("com.aspose.slides.OdpException");
exports.OdpReadException = java.import("com.aspose.slides.OdpReadException");
exports.OleEmbeddedDataInfo = java.import("com.aspose.slides.OleEmbeddedDataInfo");
exports.OleObjectFrame = java.import("com.aspose.slides.OleObjectFrame");
exports.OpenAIWebClient = java.import("com.aspose.slides.OpenAIWebClient");
exports.OptionalBlackTransition = java.import("com.aspose.slides.OptionalBlackTransition");
exports.OrganizationChartLayoutType = java.import("com.aspose.slides.OrganizationChartLayoutType");
exports.Orientation = java.import("com.aspose.slides.Orientation");
exports.OrientationTransition = java.import("com.aspose.slides.OrientationTransition");
exports.OuterShadow = java.import("com.aspose.slides.OuterShadow");
exports.Output = java.import("com.aspose.slides.Output");
exports.OutputFile = java.import("com.aspose.slides.OutputFile");
exports.OutputFile.writeToStream = function(outputfile, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	outputfile.write(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.OverrideTheme = java.import("com.aspose.slides.OverrideTheme");
exports.PPImage = java.import("com.aspose.slides.PPImage");
exports.PVIObject = java.import("com.aspose.slides.PVIObject");
exports.Paragraph = java.import("com.aspose.slides.Paragraph");
exports.ParagraphCollection = java.import("com.aspose.slides.ParagraphCollection");
exports.ParagraphFactory = java.import("com.aspose.slides.ParagraphFactory");
exports.ParagraphFormat = java.import("com.aspose.slides.ParagraphFormat");
exports.ParentLabelLayoutType = java.import("com.aspose.slides.ParentLabelLayoutType");
exports.PathCommandType = java.import("com.aspose.slides.PathCommandType");
exports.PathFillModeType = java.import("com.aspose.slides.PathFillModeType");
exports.PathSegment = java.import("com.aspose.slides.PathSegment");
exports.PatternFormat = java.import("com.aspose.slides.PatternFormat");
exports.PatternStyle = java.import("com.aspose.slides.PatternStyle");
exports.PdfAccessPermissions = java.import("com.aspose.slides.PdfAccessPermissions");
exports.PdfCompliance = java.import("com.aspose.slides.PdfCompliance");
exports.PdfImportOptions = java.import("com.aspose.slides.PdfImportOptions");
exports.PdfOptions = java.import("com.aspose.slides.PdfOptions");
exports.PdfTextCompression = java.import("com.aspose.slides.PdfTextCompression");
exports.PersistenceType = java.import("com.aspose.slides.PersistenceType");
exports.Picture = java.import("com.aspose.slides.Picture");
exports.PictureFillFormat = java.import("com.aspose.slides.PictureFillFormat");
exports.PictureFillMode = java.import("com.aspose.slides.PictureFillMode");
exports.PictureFrame = java.import("com.aspose.slides.PictureFrame");
exports.PictureFrameLock = java.import("com.aspose.slides.PictureFrameLock");
exports.PictureType = java.import("com.aspose.slides.PictureType");
exports.PicturesCompression = java.import("com.aspose.slides.PicturesCompression");
exports.PieSplitCustomPointCollection = java.import("com.aspose.slides.PieSplitCustomPointCollection");
exports.PieSplitType = java.import("com.aspose.slides.PieSplitType");
exports.Placeholder = java.import("com.aspose.slides.Placeholder");
exports.PlaceholderSize = java.import("com.aspose.slides.PlaceholderSize");
exports.PlaceholderType = java.import("com.aspose.slides.PlaceholderType");
exports.Point = java.import("com.aspose.slides.Point");
exports.PointCollection = java.import("com.aspose.slides.PointCollection");
exports.Portion = java.import("com.aspose.slides.Portion");
exports.PortionCollection = java.import("com.aspose.slides.PortionCollection");
exports.PortionFactory = java.import("com.aspose.slides.PortionFactory");
exports.PortionFormat = java.import("com.aspose.slides.PortionFormat");
exports.PptCorruptFileException = java.import("com.aspose.slides.PptCorruptFileException");
exports.PptEditException = java.import("com.aspose.slides.PptEditException");
exports.PptException = java.import("com.aspose.slides.PptException");
exports.PptOptions = java.import("com.aspose.slides.PptOptions");
exports.PptReadException = java.import("com.aspose.slides.PptReadException");
exports.PptUnsupportedFormatException = java.import("com.aspose.slides.PptUnsupportedFormatException");
exports.PptxCorruptFileException = java.import("com.aspose.slides.PptxCorruptFileException");
exports.PptxEditException = java.import("com.aspose.slides.PptxEditException");
exports.PptxException = java.import("com.aspose.slides.PptxException");
exports.PptxOptions = java.import("com.aspose.slides.PptxOptions");
exports.PptxReadException = java.import("com.aspose.slides.PptxReadException");
exports.PptxUnsupportedFormatException = java.import("com.aspose.slides.PptxUnsupportedFormatException");
exports.Presentation = java.import("com.aspose.slides.Presentation");
exports.Presentation.createPresentationFromStream = function(arg0, arg1, arg2) {
if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var presentation;
		var error;
		try {
			presentation = java.newInstanceSync("com.aspose.slides.Presentation", inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, presentation);
	});
}
else if (arguments.length == 2 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var presentation;
		var error;
		try {
			presentation = java.newInstanceSync("com.aspose.slides.Presentation", inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, presentation);
	});
}
else throw new Error("Invalid arguments");
};
exports.Presentation.saveToStream = function(presentation, arg0, arg1, arg2, arg3) {
if (arguments.length == 5 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	presentation.save(outputStreamBuffer, arg1, arg2, arg3);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else if (arguments.length == 4 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	presentation.save(outputStreamBuffer, arg1, arg2);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else if (arguments.length == 3 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	presentation.save(outputStreamBuffer, arg1);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.PresentationAnimationsGenerator = java.import("com.aspose.slides.PresentationAnimationsGenerator");
exports.PresentationFactory = java.import("com.aspose.slides.PresentationFactory");
exports.PresentationFactory.readPresentationFromStream = function(presentationfactory, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = presentationfactory.readPresentation(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = presentationfactory.readPresentation(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.PresentationFactory.getPresentationInfoFromStream = function(presentationfactory, arg0, arg1) {
if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = presentationfactory.getPresentationInfo(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.PresentationFactory.getPresentationTextFromStream = function(presentationfactory, arg0, arg1, arg2, arg3) {
if (arguments.length == 5 && __typeof__(arg0) == "ReadStream" && __typeof__(arg3) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = presentationfactory.getPresentationText(inputStreamBuffer.toInputStream(), arg1, arg2);
		}
		catch (err) {
			error = err;
		}
		arg3(error, item);
	});
}
else if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = presentationfactory.getPresentationText(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.PresentationHeaderFooterManager = java.import("com.aspose.slides.PresentationHeaderFooterManager");
exports.PresentationInfo = java.import("com.aspose.slides.PresentationInfo");
exports.PresentationInfo.writeBindedPresentationToStream = function(presentationinfo, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	presentationinfo.writeBindedPresentation(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.PresentationLockingBehavior = java.import("com.aspose.slides.PresentationLockingBehavior");
exports.PresentationPlayer = java.import("com.aspose.slides.PresentationPlayer");
exports.PresentationText = java.import("com.aspose.slides.PresentationText");
exports.PresentedBySpeaker = java.import("com.aspose.slides.PresentedBySpeaker");
exports.PresetColor = java.import("com.aspose.slides.PresetColor");
exports.PresetShadow = java.import("com.aspose.slides.PresetShadow");
exports.PresetShadowType = java.import("com.aspose.slides.PresetShadowType");
exports.PropertyCalcModeType = java.import("com.aspose.slides.PropertyCalcModeType");
exports.PropertyEffect = java.import("com.aspose.slides.PropertyEffect");
exports.PropertyValueType = java.import("com.aspose.slides.PropertyValueType");
exports.ProtectionManager = java.import("com.aspose.slides.ProtectionManager");
exports.QuartileMethodType = java.import("com.aspose.slides.QuartileMethodType");
exports.RectangleAlignment = java.import("com.aspose.slides.RectangleAlignment");
exports.Reflection = java.import("com.aspose.slides.Reflection");
exports.RenderingOptions = java.import("com.aspose.slides.RenderingOptions");
exports.ResourceLoadingAction = java.import("com.aspose.slides.ResourceLoadingAction");
exports.ResponsiveHtmlController = java.import("com.aspose.slides.ResponsiveHtmlController");
exports.ReturnAction = java.import("com.aspose.slides.ReturnAction");
exports.RevealTransition = java.import("com.aspose.slides.RevealTransition");
exports.RippleTransition = java.import("com.aspose.slides.RippleTransition");
exports.Rotation3D = java.import("com.aspose.slides.Rotation3D");
exports.RotationEffect = java.import("com.aspose.slides.RotationEffect");
exports.Row = java.import("com.aspose.slides.Row");
exports.RowCollection = java.import("com.aspose.slides.RowCollection");
exports.RowFormat = java.import("com.aspose.slides.RowFormat");
exports.SVGOptions = java.import("com.aspose.slides.SVGOptions");
exports.SaveFormat = java.import("com.aspose.slides.SaveFormat");
exports.SaveOptions = java.import("com.aspose.slides.SaveOptions");
exports.SaveOptionsFactory = java.import("com.aspose.slides.SaveOptionsFactory");
exports.ScaleEffect = java.import("com.aspose.slides.ScaleEffect");
exports.SchemeColor = java.import("com.aspose.slides.SchemeColor");
exports.Section = java.import("com.aspose.slides.Section");
exports.SectionCollection = java.import("com.aspose.slides.SectionCollection");
exports.SectionSlideCollection = java.import("com.aspose.slides.SectionSlideCollection");
exports.SectionZoomFrame = java.import("com.aspose.slides.SectionZoomFrame");
exports.Sequence = java.import("com.aspose.slides.Sequence");
exports.SequenceCollection = java.import("com.aspose.slides.SequenceCollection");
exports.SetEffect = java.import("com.aspose.slides.SetEffect");
exports.Shape = java.import("com.aspose.slides.Shape");
exports.Shape.writeAsSvgToStream = function(shape, arg0, arg1) {
if (arguments.length == 3 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	shape.writeAsSvg(outputStreamBuffer, arg1);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	shape.writeAsSvg(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.ShapeAdjustmentType = java.import("com.aspose.slides.ShapeAdjustmentType");
exports.ShapeBevel = java.import("com.aspose.slides.ShapeBevel");
exports.ShapeCollection = java.import("com.aspose.slides.ShapeCollection");
exports.ShapeCollection.insertAudioFrameEmbeddedFromStream = function(shapecollection, arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
if (arguments.length == 8 && __typeof__(arg5) == "ReadStream" && __typeof__(arg6) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg5.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg5.on('end', function() {
		var item;
		var error;
		try {
			item = shapecollection.insertAudioFrameEmbedded(arg0, arg1, arg2, arg3, arg4, inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg6(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.ShapeCollection.addAudioFrameEmbeddedFromStream = function(shapecollection, arg0, arg1, arg2, arg3, arg4, arg5) {
if (arguments.length == 7 && __typeof__(arg4) == "ReadStream" && __typeof__(arg5) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg4.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg4.on('end', function() {
		var item;
		var error;
		try {
			item = shapecollection.addAudioFrameEmbedded(arg0, arg1, arg2, arg3, inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg5(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.ShapeElement = java.import("com.aspose.slides.ShapeElement");
exports.ShapeElementFillSource = java.import("com.aspose.slides.ShapeElementFillSource");
exports.ShapeElementStrokeSource = java.import("com.aspose.slides.ShapeElementStrokeSource");
exports.ShapeFrame = java.import("com.aspose.slides.ShapeFrame");
exports.ShapeStyle = java.import("com.aspose.slides.ShapeStyle");
exports.ShapeThumbnailBounds = java.import("com.aspose.slides.ShapeThumbnailBounds");
exports.ShapeType = java.import("com.aspose.slides.ShapeType");
exports.ShapeUtil = java.import("com.aspose.slides.ShapeUtil");
exports.ShapesAlignmentType = java.import("com.aspose.slides.ShapesAlignmentType");
exports.ShredTransition = java.import("com.aspose.slides.ShredTransition");
exports.SideDirectionTransition = java.import("com.aspose.slides.SideDirectionTransition");
exports.SketchFormat = java.import("com.aspose.slides.SketchFormat");
exports.Slide = java.import("com.aspose.slides.Slide");
exports.Slide.writeAsEmfToStream = function(slide, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	slide.writeAsEmf(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.Slide.writeAsSvgToStream = function(slide, arg0, arg1) {
if (arguments.length == 3 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	slide.writeAsSvg(outputStreamBuffer, arg1);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	slide.writeAsSvg(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.SlideCollection = java.import("com.aspose.slides.SlideCollection");
exports.SlideCollection.insertFromHtmlFromStream = function(slidecollection, arg0, arg1, arg2, arg3, arg4, arg5) {
if (arguments.length == 7 && __typeof__(arg1) == "ReadStream" && __typeof__(arg5) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg1.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg1.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.insertFromHtml(arg0, inputStreamBuffer.toInputStream(), arg2, arg3, arg4);
		}
		catch (err) {
			error = err;
		}
		arg5(error, item);
	});
}
else if (arguments.length == 6 && __typeof__(arg1) == "ReadStream" && __typeof__(arg4) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg1.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg1.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.insertFromHtml(arg0, inputStreamBuffer.toInputStream(), arg2, arg3);
		}
		catch (err) {
			error = err;
		}
		arg4(error, item);
	});
}
else if (arguments.length == 5 && __typeof__(arg1) == "ReadStream" && __typeof__(arg3) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg1.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg1.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.insertFromHtml(arg0, inputStreamBuffer.toInputStream(), arg2);
		}
		catch (err) {
			error = err;
		}
		arg3(error, item);
	});
}
else if (arguments.length == 4 && __typeof__(arg1) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg1.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg1.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.insertFromHtml(arg0, inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.SlideCollection.addFromPdfFromStream = function(slidecollection, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.addFromPdf(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.addFromPdf(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.SlideCollection.addFromHtmlFromStream = function(slidecollection, arg0, arg1, arg2, arg3) {
if (arguments.length == 5 && __typeof__(arg0) == "ReadStream" && __typeof__(arg3) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.addFromHtml(inputStreamBuffer.toInputStream(), arg1, arg2);
		}
		catch (err) {
			error = err;
		}
		arg3(error, item);
	});
}
else if (arguments.length == 3 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = slidecollection.addFromHtml(inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.SlideHeaderFooterManager = java.import("com.aspose.slides.SlideHeaderFooterManager");
exports.SlideImageFormat = java.import("com.aspose.slides.SlideImageFormat");
exports.SlideLayoutType = java.import("com.aspose.slides.SlideLayoutType");
exports.SlideOrientation = java.import("com.aspose.slides.SlideOrientation");
exports.SlideShowSettings = java.import("com.aspose.slides.SlideShowSettings");
exports.SlideShowTransition = java.import("com.aspose.slides.SlideShowTransition");
exports.SlideShowType = java.import("com.aspose.slides.SlideShowType");
exports.SlideSize = java.import("com.aspose.slides.SlideSize");
exports.SlideSizeScaleType = java.import("com.aspose.slides.SlideSizeScaleType");
exports.SlideSizeType = java.import("com.aspose.slides.SlideSizeType");
exports.SlideThemeManager = java.import("com.aspose.slides.SlideThemeManager");
exports.SlideUtil = java.import("com.aspose.slides.SlideUtil");
exports.SlidesAIAgent = java.import("com.aspose.slides.SlidesAIAgent");
exports.SlidesAIAgentException = java.import("com.aspose.slides.SlidesAIAgentException");
exports.SlidesRange = java.import("com.aspose.slides.SlidesRange");
exports.SmartArt = java.import("com.aspose.slides.SmartArt");
exports.SmartArtColorType = java.import("com.aspose.slides.SmartArtColorType");
exports.SmartArtLayoutType = java.import("com.aspose.slides.SmartArtLayoutType");
exports.SmartArtNode = java.import("com.aspose.slides.SmartArtNode");
exports.SmartArtNodeCollection = java.import("com.aspose.slides.SmartArtNodeCollection");
exports.SmartArtQuickStyleType = java.import("com.aspose.slides.SmartArtQuickStyleType");
exports.SmartArtShape = java.import("com.aspose.slides.SmartArtShape");
exports.SmartArtShapeCollection = java.import("com.aspose.slides.SmartArtShapeCollection");
exports.SoftEdge = java.import("com.aspose.slides.SoftEdge");
exports.SourceFormat = java.import("com.aspose.slides.SourceFormat");
exports.SplitTransition = java.import("com.aspose.slides.SplitTransition");
exports.SplitterBarStateType = java.import("com.aspose.slides.SplitterBarStateType");
exports.SpreadsheetOptions = java.import("com.aspose.slides.SpreadsheetOptions");
exports.Storage = java.import("com.aspose.slides.Storage");
exports.StringChartValue = java.import("com.aspose.slides.StringChartValue");
exports.StringOrDoubleChartValue = java.import("com.aspose.slides.StringOrDoubleChartValue");
exports.StyleType = java.import("com.aspose.slides.StyleType");
exports.SummaryZoomFrame = java.import("com.aspose.slides.SummaryZoomFrame");
exports.SummaryZoomSection = java.import("com.aspose.slides.SummaryZoomSection");
exports.SummaryZoomSectionCollection = java.import("com.aspose.slides.SummaryZoomSectionCollection");
exports.SvgCoordinateUnit = java.import("com.aspose.slides.SvgCoordinateUnit");
exports.SvgEvent = java.import("com.aspose.slides.SvgEvent");
exports.SvgExternalFontsHandling = java.import("com.aspose.slides.SvgExternalFontsHandling");
exports.SvgImage = java.import("com.aspose.slides.SvgImage");
exports.SvgImage.createSvgImageFromStream = function(arg0, arg1, arg2, arg3) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg3) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var svgimage;
		var error;
		try {
			svgimage = java.newInstanceSync("com.aspose.slides.SvgImage", inputStreamBuffer.toInputStream(), arg1, arg2);
		}
		catch (err) {
			error = err;
		}
		arg3(error, svgimage);
	});
}
else if (arguments.length == 2 && __typeof__(arg0) == "ReadStream" && __typeof__(arg1) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var svgimage;
		var error;
		try {
			svgimage = java.newInstanceSync("com.aspose.slides.SvgImage", inputStreamBuffer.toInputStream());
		}
		catch (err) {
			error = err;
		}
		arg1(error, svgimage);
	});
}
else throw new Error("Invalid arguments");
};
exports.SvgImage.writeAsEmfToStream = function(svgimage, arg0) {
if (arguments.length == 2 && __typeof__(arg0) == "WriteStream") {
	var outputStreamBuffer = new exports.StreamBuffer();
	svgimage.writeAsEmf(outputStreamBuffer);
	var buf;
	while ((buf = outputStreamBuffer.read(4096)) != null) {
		arg0.write(new Buffer(buf));
	}
	arg0.end();
}
else throw new Error("Invalid arguments");
};
exports.SvgShape = java.import("com.aspose.slides.SvgShape");
exports.SvgTSpan = java.import("com.aspose.slides.SvgTSpan");
exports.SwfOptions = java.import("com.aspose.slides.SwfOptions");
exports.SystemColor = java.import("com.aspose.slides.SystemColor");
exports.Tab = java.import("com.aspose.slides.Tab");
exports.TabAlignment = java.import("com.aspose.slides.TabAlignment");
exports.TabCollection = java.import("com.aspose.slides.TabCollection");
exports.TabFactory = java.import("com.aspose.slides.TabFactory");
exports.Table = java.import("com.aspose.slides.Table");
exports.TableFormat = java.import("com.aspose.slides.TableFormat");
exports.TableStylePreset = java.import("com.aspose.slides.TableStylePreset");
exports.TagCollection = java.import("com.aspose.slides.TagCollection");
exports.TemplateContext = java.import("com.aspose.slides.TemplateContext");
exports.TextAlignment = java.import("com.aspose.slides.TextAlignment");
exports.TextAnchorType = java.import("com.aspose.slides.TextAnchorType");
exports.TextAnimation = java.import("com.aspose.slides.TextAnimation");
exports.TextAnimationCollection = java.import("com.aspose.slides.TextAnimationCollection");
exports.TextAutofitType = java.import("com.aspose.slides.TextAutofitType");
exports.TextCapType = java.import("com.aspose.slides.TextCapType");
exports.TextExtractionArrangingMode = java.import("com.aspose.slides.TextExtractionArrangingMode");
exports.TextFrame = java.import("com.aspose.slides.TextFrame");
exports.TextFrameFormat = java.import("com.aspose.slides.TextFrameFormat");
exports.TextHighlightingOptions = java.import("com.aspose.slides.TextHighlightingOptions");
exports.TextInheritanceLimit = java.import("com.aspose.slides.TextInheritanceLimit");
exports.TextSearchOptions = java.import("com.aspose.slides.TextSearchOptions");
exports.TextShapeType = java.import("com.aspose.slides.TextShapeType");
exports.TextStrikethroughType = java.import("com.aspose.slides.TextStrikethroughType");
exports.TextStyle = java.import("com.aspose.slides.TextStyle");
exports.TextToHtmlConversionOptions = java.import("com.aspose.slides.TextToHtmlConversionOptions");
exports.TextUnderlineType = java.import("com.aspose.slides.TextUnderlineType");
exports.TextVerticalOverflowType = java.import("com.aspose.slides.TextVerticalOverflowType");
exports.TextVerticalType = java.import("com.aspose.slides.TextVerticalType");
exports.Theme = java.import("com.aspose.slides.Theme");
exports.ThreeDFormat = java.import("com.aspose.slides.ThreeDFormat");
exports.TickLabelPositionType = java.import("com.aspose.slides.TickLabelPositionType");
exports.TickMarkType = java.import("com.aspose.slides.TickMarkType");
exports.TiffCompressionTypes = java.import("com.aspose.slides.TiffCompressionTypes");
exports.TiffOptions = java.import("com.aspose.slides.TiffOptions");
exports.TileFlip = java.import("com.aspose.slides.TileFlip");
exports.TimeUnitType = java.import("com.aspose.slides.TimeUnitType");
exports.Timing = java.import("com.aspose.slides.Timing");
exports.Tint = java.import("com.aspose.slides.Tint");
exports.TransitionCornerAndCenterDirectionType = java.import("com.aspose.slides.TransitionCornerAndCenterDirectionType");
exports.TransitionCornerDirectionType = java.import("com.aspose.slides.TransitionCornerDirectionType");
exports.TransitionEightDirectionType = java.import("com.aspose.slides.TransitionEightDirectionType");
exports.TransitionInOutDirectionType = java.import("com.aspose.slides.TransitionInOutDirectionType");
exports.TransitionLeftRightDirectionType = java.import("com.aspose.slides.TransitionLeftRightDirectionType");
exports.TransitionMorphType = java.import("com.aspose.slides.TransitionMorphType");
exports.TransitionPattern = java.import("com.aspose.slides.TransitionPattern");
exports.TransitionShredPattern = java.import("com.aspose.slides.TransitionShredPattern");
exports.TransitionSideDirectionType = java.import("com.aspose.slides.TransitionSideDirectionType");
exports.TransitionSoundMode = java.import("com.aspose.slides.TransitionSoundMode");
exports.TransitionSpeed = java.import("com.aspose.slides.TransitionSpeed");
exports.TransitionType = java.import("com.aspose.slides.TransitionType");
exports.TransitionValueBase = java.import("com.aspose.slides.TransitionValueBase");
exports.Trendline = java.import("com.aspose.slides.Trendline");
exports.TrendlineCollection = java.import("com.aspose.slides.TrendlineCollection");
exports.TrendlineType = java.import("com.aspose.slides.TrendlineType");
exports.UpDownBarsManager = java.import("com.aspose.slides.UpDownBarsManager");
exports.VbaModule = java.import("com.aspose.slides.VbaModule");
exports.VbaModuleCollection = java.import("com.aspose.slides.VbaModuleCollection");
exports.VbaProject = java.import("com.aspose.slides.VbaProject");
exports.VbaProjectFactory = java.import("com.aspose.slides.VbaProjectFactory");
exports.VbaReferenceCollection = java.import("com.aspose.slides.VbaReferenceCollection");
exports.VbaReferenceFactory = java.import("com.aspose.slides.VbaReferenceFactory");
exports.VbaReferenceOleTypeLib = java.import("com.aspose.slides.VbaReferenceOleTypeLib");
exports.Video = java.import("com.aspose.slides.Video");
exports.VideoCollection = java.import("com.aspose.slides.VideoCollection");
exports.VideoCollection.addVideoFromStream = function(videocollection, arg0, arg1, arg2) {
if (arguments.length == 4 && __typeof__(arg0) == "ReadStream" && __typeof__(arg2) == "Function") {
	var inputStreamBuffer = new exports.StreamBuffer();
	arg0.on('data', function(chunk) {
		inputStreamBuffer.write(chunk);
	});
	arg0.on('end', function() {
		var item;
		var error;
		try {
			item = videocollection.addVideo(inputStreamBuffer.toInputStream(), arg1);
		}
		catch (err) {
			error = err;
		}
		arg2(error, item);
	});
}
else throw new Error("Invalid arguments");
};
exports.VideoFrame = java.import("com.aspose.slides.VideoFrame");
exports.VideoPlayModePreset = java.import("com.aspose.slides.VideoPlayModePreset");
exports.VideoPlayerHtmlController = java.import("com.aspose.slides.VideoPlayerHtmlController");
exports.VideoPlayerHtmlControllerFactory = java.import("com.aspose.slides.VideoPlayerHtmlControllerFactory");
exports.ViewProperties = java.import("com.aspose.slides.ViewProperties");
exports.ViewType = java.import("com.aspose.slides.ViewType");
exports.WarningType = java.import("com.aspose.slides.WarningType");
exports.WebDocument = java.import("com.aspose.slides.WebDocument");
exports.WebDocumentOptions = java.import("com.aspose.slides.WebDocumentOptions");
exports.WheelTransition = java.import("com.aspose.slides.WheelTransition");
exports.XamlOptions = java.import("com.aspose.slides.XamlOptions");
exports.XpsOptions = java.import("com.aspose.slides.XpsOptions");
exports.Zip64Mode = java.import("com.aspose.slides.Zip64Mode");
exports.ZoomFrame = java.import("com.aspose.slides.ZoomFrame");
exports.ZoomImageType = java.import("com.aspose.slides.ZoomImageType");
exports.ZoomLayout = java.import("com.aspose.slides.ZoomLayout");
exports.ZoomObject = java.import("com.aspose.slides.ZoomObject");
