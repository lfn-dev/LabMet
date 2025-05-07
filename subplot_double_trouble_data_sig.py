import sys
import os
import xarray as xr
import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np
import cmasher as cmr
import cartopy.feature as cfeature
import cartopy.crs as ccrs
from cartopy.util import add_cyclic
from cartopy.mpl.gridliner import LATITUDE_FORMATTER, LONGITUDE_FORMATTER
from cartopy.mpl.ticker import (LongitudeFormatter, LatitudeFormatter,
                                LatitudeLocator, LongitudeLocator)
import scipy.ndimage as ndimage
from contextlib import redirect_stdout


def smooth_data(data, factor=3, order=3):
    """
    Apply smoothing by zooming in on the dataset and correcting NaN values.
    
    Parameters:
        data (np.array): Input 2D data array with NaN values.
        factor (int): Factor by which to increase resolution.
        order (int): Order of the spline interpolation.
    
    Returns:
        np.array: Smoothed data.
        np.array: New latitude values after smoothing.
        np.array: New longitude values after smoothing.

        
        https://stackoverflow.com/a/12311139
        https://stackoverflow.com/a/36307291
    """
    # Replace NaNs with zeros for interpolation
    data_filled = np.where(np.isnan(data), 0, data)
    # Create a mask to restore NaNs later
    mask = np.where(np.isnan(data), 0, 1)
    
    # Apply zoom to data and mask
    smoothed_data = ndimage.zoom(data_filled, factor, order=order)
    smoothed_mask = ndimage.zoom(mask, factor, order=order)
    
    # Correct smoothed data by dividing by mask to restore original NaN regions
    result = smoothed_data / smoothed_mask
    
    # Generate new lat/lon grid based on smoothed data size
    lat_new = np.linspace(data['lat'][0].values, data['lat'][-1].values, num=result.shape[0])
    lon_new = np.linspace(data['lon'][0].values, data['lon'][-1].values, num=result.shape[1])
    
    return result, lat_new, lon_new


def get_colormap(cmap_name):
    """
    Get a matplotlib cmap or load a cmap from file.
    """
    try:
        colormap = mpl.colormaps.get_cmap(cmap_name)

    except ValueError:
        # Load custom colormap from external file
        rgb_data = np.loadtxt(cmap_name)
        colormap = mpl.colors.LinearSegmentedColormap.from_list('colormap', rgb_data)
    
    return colormap


#-#---- Custom Hatch definition -----
#-
#-import matplotlib.hatch
#-import matplotlib.patches as patches
#-from matplotlib.path import Path
#-
#-# Creating a '+' pattern
#-
#-#https://matplotlib.org/stable/users/explain/artists/paths.html
#-verts = [
#-   (-.2, 0. ),  # left, middle
#-   ( .2, 0. ),  # right, middle
#-   (0. ,  .2),  # middle, top
#-   (0. , -.2),  # middle, bottom
#-]
#-
#-codes = [
#-    Path.MOVETO,
#-    Path.LINETO,
#-    Path.MOVETO,
#-    Path.LINETO,
#-]
#-
#-custom_path = Path(verts, codes)
#-
#-# https://stackoverflow.com/questions/17285154/how-to-fill-a-polygon-with-a-custom-hatch-in-matplotlib
#-class CustomHatch(matplotlib.hatch.Shapes):
#-    """
#-    Custom hatches defined by a path drawn inside [0, 1] square.
#-    Identifier 'c'.
#-    """
#-    filled = True
#-    size = 1.0
#-    path = custom_path
#-
#-    def __init__(self, hatch, density):
#-        self.num_rows = (hatch.count('c')) * density
#-        self.shape_vertices = self.path.vertices
#-        self.shape_codes = self.path.codes
#-        matplotlib.hatch.Shapes.__init__(self, hatch, density)
#-
#-matplotlib.hatch._hatch_types.append(CustomHatch)
#-#----------------------------------

def create_line_subplot(ax,xdata,ydata,
        xlabel='', ylabel='', title=None, title_size=None,
        gridline_pattern=None,
        label_size: list[float,float] = [],
        numticks:   list[int,int] = [],
        tick_size:  list[float,float] = [],
        **kwargs):
    """
    Create a single line subplot. Used to plot Factor Scores from PCA.
    
    Parameters:
        ax: Matplotlib axis object
        xdata: data in x axis
        ydata: data in y axis
        x_label: Label name to plot the x axis
        y_label: Label name to plot the y axis
        title: Optional subtitle for this subplot
        color: Line color
        marker: Marker pattern for data points
        linestyle: dash pattern to draw lines
        linewidth: width of line
        label_size: X and Y label size
        numticks: X and Y number of ticks
        tick_size: X and Y tick size
    
    Returns:
        p: a list of Line2D representing the plot
    """


    p = ax.plot(xdata,ydata,**kwargs)


    # Changing plot text parameters

    if label_size:
        ax.set_xlabel(xlabel,fontsize=label_size[0])
        ax.set_ylabel(ylabel,fontsize=label_size[1])

    if numticks:
        ax.xaxis.set_major_locator(mpl.ticker.MaxNLocator(numticks[0]))
        ax.yaxis.set_major_locator(mpl.ticker.MaxNLocator(numticks[1]))

    if tick_size:
       ax.tick_params(axis='x', which='major', labelsize=tick_size[0])
       ax.tick_params(axis='y', which='major', labelsize=tick_size[1])

    if gridline_pattern:
        ax.grid(linestyle=gridline_pattern)

    if title:
        if title_size:
            ax.set_title(title,fontsize=title_size)
        else:
            ax.set_title(title)
    


    return p
    
def create_subplot(ax, data, sig, lon_grid, lat_grid, colormap,
        levels, siglevel, extent='global', mask=None,
        ccolor='k', hcolor='k', hatch_pattern='..',
        is_leftmost=False, is_bottom=False, title=None, title_size=None,
        gridline_pattern=None, gridline_width=0.5,
        lon_label_size=9,lat_label_size=9):
    """
    Create a single subplot with the given data and settings.
    
    Parameters:
        ax: Matplotlib axis object
        data: Input data
        sig: Significance data
        lon_grid, lat_grid: Coordinates for plotting
        colormap: Colormap to use
        levels: Contour levels
        siglevel: Significance level
        extent: Lat Lon extent for plotting
        ccolor: Coastline color
        hcolor: Hatch color
        hatch_pattern: Pattern used for hatching
        is_leftmost: Whether this subplot is in the leftmost column
        is_bottom: Whether this subplot is in the bottom row
        title: Optional subtitle for this subplot
        title_size: Size of subtitle
        gridline_pattern: dash pattern to draw gridlines, if None: hide gridlines
        lon_label_size: longitude label size
        lat_label_size: latitude label size
    
    Returns:
        p: The contourf object (for colorbar reference)
    """

    p = ax.contourf(lon_grid, lat_grid, data, transform=ccrs.PlateCarree(), cmap=colormap,
                   levels=levels, extend='both')
    
    # Add geographic features
    ax.add_feature(cfeature.COASTLINE, edgecolor=ccolor)
    if(mask == 'land'):
        ax.add_feature(cfeature.LAND, zorder=100, edgecolor=ccolor, facecolor='w', linewidth=1)
    if(mask == 'ocean'):
        ax.add_feature(cfeature.BORDERS, edgecolor=ccolor, linewidth=0.6)
        ax.add_feature(cfeature.OCEAN, zorder=100, edgecolor=ccolor, facecolor='w', linewidth=1)



    extent = extent.lower().split()
    if len(extent) == 1 and 'ams' in extent:
        ax.set_extent([-83.75, -31.25, -45, 15],ccrs.PlateCarree())
    elif len(extent) == 1 and 'global' in extent:
        ax.set_global()
    elif len(extent) == 4:
        ax.set_extent([float(e) for e in extent],ccrs.PlateCarree())
    else:
        print(f"Warning: invalid extent '{extent}'. using global extent.",file=sys.stderr)
        ax.set_global()



    if sig is not None and hatch_pattern is not None:
        # Add hatch
        sig_masked = np.where(abs(sig) > siglevel, 1, np.nan)
        #sig_masked = np.where(abs(sig) > siglevel, np.nan, 1)
        lon, lat = np.meshgrid(sig['lon'], sig['lat'])

        if '@' in hatch_pattern:
            #-plt.rcParams['hatch.linewidth'] = 0.6
            plt.rcParams['hatch.linewidth'] = 0.8
            plt.rcParams['hatch.color'] = 'white'
            ax.pcolor(lon, lat, sig_masked, alpha=0., hatch='.'*hatch_pattern.count('@'), transform=ccrs.PlateCarree())
            plt.rcParams['hatch.linewidth'] = 0.3
            plt.rcParams['hatch.color'] = hcolor
            ax.pcolor(lon, lat, sig_masked, alpha=0., hatch='o'*hatch_pattern.count('@'), transform=ccrs.PlateCarree())
        else:
            plt.rcParams['hatch.linewidth'] = 0.75
            plt.rcParams['hatch.color'] = hcolor
            ax.pcolor(lon, lat, sig_masked, alpha=0., hatch=hatch_pattern, transform=ccrs.PlateCarree())


    # Add gridlines
    if gridline_pattern is None:
        gridline_pattern='-'
        show_gridlines = False
    else:
        show_gridlines = True


    g1 = ax.gridlines(crs=ccrs.PlateCarree(), linestyle=gridline_pattern, linewidth=gridline_width, color='k', draw_labels=True, visible=show_gridlines)
    g1.zorder = 101
    g1.right_labels = False
    g1.top_labels = False

    g1.left_labels = is_leftmost  # Only show on leftmost column
    g1.bottom_labels = is_bottom  # Only show on bottom row

    g1.xformatter = LONGITUDE_FORMATTER
    g1.yformatter = LATITUDE_FORMATTER
    g1.xlabel_style = {'size': lon_label_size}
    g1.ylabel_style = {'size': lat_label_size}


    if title:
        if title_size:
            ax.set_title(title,fontsize=title_size)
        else:
            ax.set_title(title)
    
    return p

# creating a modiefied class to store wich keys have been searched
class TrackedDict(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.searched_keys = set()

    def get(self, key, default=None):
        self.searched_keys.add(key)
        return super().get(key, default)

    def get_searched_keys(self) -> set:
        return self.searched_keys


def main(
        input_files : list[str|os.PathLike],
        output_file : str|os.PathLike,
        sig_files   : list[str|os.PathLike] = None,
        quiet=False,
        **kwargs,
    ) -> None :

    # Load kwargs 
    input_args = TrackedDict(kwargs)

    # Defining some dafault values
    levels_str = "-1.2 -1 -0.8 -0.6 -0.4 -0.2 0 0.2 0.4 0.6 0.8 1 1.2"

    # Setting the default values

    # output options
    output_hscale   = float(input_args.get('horizontal_scale'   , 4))
    output_vscale   = float(input_args.get('vertical_scale'     , 2))
    dpi             = int(input_args.get('dpi'                  , 300))

    # smoothing options
    smooth_factor   = int(input_args.get('smooth_factor', 1))
    smooth_order    = int(input_args.get('smooth_order' , 3))

    # plot options
    max_cols        = int(input_args.get('cols'                 ,  3))
    var             = str(input_args.get('var'                  , 'v1'))
    is_cyclic       = bool(input_args.get('is_cyclic'           , False))
    sigvar          = str(input_args.get('sigvar'               , var))
    siglevel        = float(input_args.get('significance_level' , 90))
    ccolor          = str(input_args.get('contour_color'        , 'black'))
    hcolor          = str(input_args.get('hatch_color'          , 'black'))
    wspace          = input_args.get('width_space'              , None)
    hspace          = input_args.get('height_space'             , None)
    always_show_lat = bool(input_args.get('always_show_lat'     , False))
    always_show_lon = bool(input_args.get('always_show_lon'     , False))
    hatch_pattern   = input_args.get('hatch_pattern'            , None)
    extent          = input_args.get('extent'                   , 'global')
    mask            = input_args.get('mask'                     , None)
    gridline        = input_args.get('gridline_pattern'         , None)
    gridline_width  = float(input_args.get('gridline_width'     , 0.5))
    levels          = input_args.get('levels'                   , levels_str)
    use_levels_in_p = input_args.get('use_levels_in_plots'      , [])
    cmap            = str(input_args.get('cmap'                 , 'RdBu'))
    use_cmap_in_p   = input_args.get('use_cmap_in_plots'        , [])
    cmap_upper      = float(input_args.get('upper_cmap_cut'     , 1))
    cmap_lower      = float(input_args.get('lower_cmap_cut'     , 0))
    cbar_orientation= input_args.get('cbar_orientation'         , 'horizontal')
    cbar_padding    = float(input_args.get('cbar_padding'       , 0.0))
    cbar_border     = float(input_args.get('cbar_border'        , 0.0))
    cbar_offset     = float(input_args.get('cbar_offset'        , 0.0))
    cbar_xoffset    = float(input_args.get('cbar_xoffset'       , 0.0))
    cbar_yoffset    = float(input_args.get('cbar_yoffset'       , 0.0))
    multi_cbar      = input_args.get('multi_cbar'               , [])

    # plot txt options
    tfont               = input_args.get('title_fonts'              , ['monospace'])
    suptitle            = input_args.get('suptitle'                 , None)
    suptitle_offset     = float(input_args.get('suptitle_offset'    , 0.0))
    suptitle_size       = float(input_args.get('suptitle_size'      , 18))
    subtitles           = input_args.get('subtitles'                , None)
    subtitles_size      = input_args.get('subtitles_size'           , None)
    row_titles          = input_args.get('row_titles'               , None)
    row_titles_offset   = float(input_args.get('row_titles_offset'  , 0.01))
    row_titles_size     = float(input_args.get('row_titles_size'    , 12))
    col_titles          = input_args.get('col_titles'               , None)
    col_titles_offset   = float(input_args.get('col_titles_offset'  , 0.03))
    col_titles_size     = float(input_args.get('col_titles_size'    , 12))
    labels              = input_args.get('labels'                   , None)
    labels_xoffset      = float(input_args.get('labels_xoffset'     , -0.012))
    labels_yoffset      = float(input_args.get('labels_yoffset'     , 0.012))
    labels_size         = float(input_args.get('labels_size'        , 9))
    lat_label_size      = float(input_args.get('lat_label_size'     , 9))
    lon_label_size      = float(input_args.get('lon_label_size'     , 9))
    cbar_labels         = input_args.get('cbar_labels'              , [])

    # lineplot options
    line_linestyle  = input_args.get('line_style'       , '-')
    line_color      = input_args.get('line_color'       , 'k')
    line_width      = input_args.get('line_width'       , 1)
    line_marker     = input_args.get('line_marker'      , '.')
    line_tick_size  = input_args.get('line_tick_size'   , [5 , 5 ])
    line_numticks   = input_args.get('line_numticks'    , [8 , 5 ])
    line_labels     = input_args.get('line_labels'      , ['', ''])
    line_label_size = input_args.get('line_label_size'  , [6 , 6 ])
    line_gridline   = input_args.get('line_gridline'    , '--')


    # show current options
    if not quiet:
        print("---------------------------")

        keys_set = set(input_args.keys())
        print("Options loaded from kwargs:")
        # Keys both in the dict and searched got their value from kwargs
        for k in keys_set & input_args.get_searched_keys():
            print(f" + '--{k}'")
        print("Options loaded from default values:")
        # Keys only present in the searched set received a default value
        for k in input_args.get_searched_keys() - keys_set:
            print(f" * '--{k}'")
        print("Unrecognized options:")
        # Keys not searched are possibly an error
        for k in keys_set - input_args.get_searched_keys():
            print(f" ! '--{k}'") 

        print("---------------------------")


    levels = [float(l) for l in levels.split()]

    if wspace: wspace = float(wspace)
    if hspace: hspace = float(hspace)
    if hatch_pattern: hatch_pattern = str(hatch_pattern)

    # Load colormap
    if cmap_lower <= 0 and cmap_upper >= 1:
        colormap = get_colormap(cmap)
    else:
        loaded_cmap = get_colormap(cmap)
        colormap = cmr.get_sub_cmap(loaded_cmap, cmap_lower, cmap_upper)

    # storing extra levels in dict
    use_levels_dict = {}
    for entry in use_levels_in_p:
        extra_levels,plots = entry.split(':', 1)
        for p in plots.split():
            use_levels_dict[int(p)] = extra_levels.split()

    # storing extra cmaps in dict
    use_cmap_dict = {}
    for entry in use_cmap_in_p:
        extra_cmap,plots = entry.split(':', 1)
        for p in plots.split():
            use_cmap_dict[int(p)] = get_colormap(extra_cmap.strip())


    
    # Calculate grid layout dimensions
    n_plots = len(input_files)

    if n_plots <= max_cols:
        n_cols = n_plots
        n_rows = 1
    else:
        n_cols = min(max_cols, n_plots)
        n_rows = (n_plots + n_cols - 1) // n_cols  # Ceiling division


    # Create figure with subplots
    fig = plt.figure(figsize=(output_hscale*n_cols, output_vscale*n_rows),dpi=dpi)
    
    # adjusting spaces before plot
    if wspace or hspace:
        plt.subplots_adjust(wspace=wspace,hspace=hspace)

    # We want to store the plots that use colormap
    all_plots = []

    # Process each input file and create subplots
    for i in range(n_plots):

        # Calculate row and column position
        row = i // n_cols
        col = i % n_cols
        
        # Determine if this subplot is in leftmost column or bottom row
        is_leftmost = always_show_lat or (col == 0)
        is_bottom = always_show_lon or (row == n_rows - 1) or (i >= (n_rows - 1) * n_cols and i < n_plots)
        
        # Create subplot with cartopy projection
        ax = fig.add_subplot(n_rows, n_cols, i+1, projection=ccrs.PlateCarree(180))

        # if input files is missing, skip this subplot
        if input_files[i]:

            # Get subtitle title if provided
            subtitle = subtitles[i] if subtitles and i < len(subtitles) else None
            
            # text files are plotted as a Line plot
            if input_files[i].lower().endswith(('.csv', '.txt')):
                import pandas as pd

                ax = fig.add_subplot(n_rows, n_cols, i+1)

                # Open text file
                df = pd.read_csv(input_files[i],sep='\s+')
                p = create_line_subplot(ax,df.iloc[:,0].copy(),df.iloc[:,1].copy(),
                        xlabel=line_labels[0],ylabel=line_labels[1], title=subtitle, title_size=subtitles_size,
                        gridline_pattern=line_gridline,
                        linestyle=line_linestyle,color=line_color,marker=line_marker,linewidth=line_width,
                        numticks=line_numticks,label_size=line_label_size,tick_size=line_tick_size)
            else:
                # Open input NetCDF files
                ds1 = xr.open_dataset(input_files[i], decode_times=False)
                
                # all the output is redirect to stderror
                with redirect_stdout(sys.stderr):
                    # Extract the required variables
                    if ds1[var].ndim == 4:
                        print(f"Warning: {var}{ds1[var].shape} from file '{input_files[i]}' is 4-dimensional, using [0][0]{ds1[var][0][0].shape}")
                        data = ds1[var][0][0]
                    elif ds1[var].ndim == 3:
                        print(f"Warning: {var}{ds1[var].shape} from file '{input_files[i]}' is 3-dimensional, using [0]{ds1[var][0].shape}")
                        data = ds1[var][0]
                    else:
                        data = ds1[var]

                    if sig_files and  i < len(sig_files) and sig_files[i]:
                        ds2 = xr.open_dataset(sig_files[i], decode_times=False)

                        if ds2[sigvar].ndim == 4:
                            print(f"Warning: {sigvar}{ds2[sigvar].shape} from file '{sig_files[i]}' is 4-dimensional, using [0][0]{ds2[sigvar][0][0].shape}")
                            sig = ds2[sigvar][0][0]
                        elif ds2[sigvar].ndim == 3:
                            sig = ds2[sigvar][0]
                            print(f"Warning: {sigvar}{ds2[sigvar].shape} from file '{sig_files[i]}' is 3-dimensional, using [0]{ds2[sigvar][0].shape}")
                        else:
                            sig = ds2[sigvar]
                    else:
                        sig = None

        
                if smooth_factor > 1:
                    # Apply smoothing
                    data_val, lat_grid, lon_grid = smooth_data(data, factor=smooth_factor, order=smooth_order)
                else:
                    # Use original data grid
                    lon_grid, lat_grid = np.meshgrid(data['lon'], data['lat'])
                    data_val=data.values

                if is_cyclic:
                    data_val, lon_grid, lat_grid = add_cyclic(data_val,lon_grid,lat_grid)



                # check if there is an alternative contour levels for plotting i
                l = use_levels_dict.get(i,levels)
                if l != levels:
                    print(f"Using alternative levels for subplot [{i}].")

                # check if there is an alternative cmap for plotting i
                c = use_cmap_dict.get(i,colormap)
                if c != colormap:
                    print(f"Using alternative colormap for subplot [{i}].")

                p = create_subplot(ax, data_val, sig, lon_grid, lat_grid, c, l, siglevel, extent,
                        mask, ccolor, hcolor, hatch_pattern, is_leftmost, is_bottom,
                        subtitle, subtitles_size, gridline, gridline_width, lon_label_size, lat_label_size)

            # Save the plots for plotting the cbar later
            all_plots.append(p)
        else:
            ax.axis('off')
            all_plots.append(None)

        # Draw figure titles
        l, b, w, h = ax.get_position().bounds
        # Get labels if provided
        if labels and i < len(labels):
            fig.text(1+labels_xoffset, 0+labels_yoffset, labels[i],
                    ha='right',va='bottom',fontsize=labels_size, family=tfont,
                    backgroundcolor='white',transform=ax.transAxes)
        # Get col title if provided
        if row == 0 and col_titles and col < len(col_titles):
            txt_ypos=b + h
            txt_xpos=l + w*0.5
            fig.text(txt_xpos, txt_ypos + col_titles_offset, col_titles[col],
                    ha='center', va='bottom', fontsize=col_titles_size, family=tfont)
        # Get row title if provided
        if is_leftmost and row_titles and row < len(row_titles):
            txt_ypos=b + h
            fig.text(0.5, txt_ypos + row_titles_offset, row_titles[row],
                    ha='center', va='bottom', fontsize=row_titles_size, family=tfont)
    

    # Test if we saved any plot with a colormap
    if all_plots:

        num_cbars = len(multi_cbar)
        if num_cbars > 0:

            # calculate the positions and size
            pos,size = np.linspace(0+cbar_border, 1-cbar_border, num=num_cbars, endpoint=False, retstep=True)

            # plot cbar for each plot index
            for i,cbar_index in enumerate(multi_cbar):

                # if we can plot a cbar
                if cbar_index > 0 and cbar_index < len(all_plots) and hasattr(all_plots[cbar_index],'cmap'):

                    # change cbar size based on orientation
                    if cbar_orientation == 'vertical':
                        cbar_ax = fig.add_axes([0.92+cbar_xoffset, pos[i]+cbar_padding+cbar_offset+cbar_yoffset, 0.02, size-cbar_padding*2])  # [left, bottom, width, height]
                    elif cbar_orientation == 'horizontal':
                        cbar_ax = fig.add_axes([pos[i]+cbar_padding+cbar_offset+cbar_xoffset, 0.05+cbar_yoffset, size-cbar_padding*2, 0.02])  # [left, bottom, width, height]

                    cbar = fig.colorbar(all_plots[cbar_index], cax=cbar_ax, orientation=cbar_orientation, label = cbar_labels[i] if i < len(cbar_labels) else None)
                else:
                    print(f"Warning: index [{cbar_index}] is out of bounds (max {len(all_plots)}) or does not have a colormap. Skipping.",file=sys.stderr)
        else:
            # Add single colorbar for all subplots
            if cbar_orientation == 'vertical':
                cbar_ax = fig.add_axes([0.92+cbar_xoffset, 0.3+cbar_offset+cbar_padding+cbar_yoffset, 0.02, 0.4-cbar_padding*2])  # [left, bottom, width, height]
            elif cbar_orientation == 'horizontal':
                cbar_ax = fig.add_axes([0.25+cbar_padding+cbar_offset+cbar_xoffset, 0.05+cbar_yoffset, 0.5-cbar_padding*2, 0.02])  # [left, bottom, width, height]

            plot_with_cmap = next((p for p in all_plots if hasattr(p,'cmap')), None)
            if plot_with_cmap:
                cbar = fig.colorbar(all_plots[0], cax=cbar_ax, orientation=cbar_orientation, label = cbar_labels[0] if len(cbar_labels) > 0 else None)
    
    # Add overall titles
    if suptitle:
        fig.suptitle(suptitle, fontsize=suptitle_size, y=1+suptitle_offset)
    
    #-# Create a hatch legend entry
    #-hatch_patch = mpl.patches.Patch(facecolor='white', edgecolor=hcolor, hatch=hatch_pattern, label=f"Alta concordância entre modelos/rodadas")

    #-# Add single legend for all subplots at the bottom
    #-fig.legend(handles=[hatch_patch], loc='lower center', bbox_to_anchor=(0.5, -0.125),
    #-           handleheight=1.5, frameon=False, ncol=1)


    
    # Save output figure
    plt.savefig(output_file, bbox_inches='tight')
    print(f"Saved output figure: {output_file}")


if __name__ == "__main__":

    import argparse
    import pickle

    parser = argparse.ArgumentParser(description="Process and visualize multiple NetCDF data files side by side.")
    
    input_group = parser.add_argument_group('Input Options')
    output_group = parser.add_argument_group('Output Options')
    plot_group = parser.add_argument_group('Plotting Options')
    text_group = parser.add_argument_group('Text Options')
    line_group = parser.add_argument_group('Line Plot Options')


    input_group.add_argument("-i", "--input_files", nargs='+', help="Paths to input NetCDF files.", action="extend")
    input_group.add_argument("-s", "--sig_files", nargs='+', help="Paths to significance NetCDF files.", action="extend")

    output_group.add_argument("--dpi", help="DPI (dots per inches) of the output image.", type=int)
    output_group.add_argument("-H","--horizontal_scale", help="Horizontal size scale for final image.", type=float)
    output_group.add_argument("-V","--vertical_scale", help="Vertical size scale for final image.", type=float)
    output_group.add_argument("-o", "--output_file", help="Path to save the output image.", type=str, default="output.png")
    output_group.add_argument("-cy", "--is_cyclic", help="Use this if there is a missing line when plotting global data.", action="store_true")

    plot_group.add_argument("-c", "--cmap", help="Use the colormap name or colormap file for plotting.", type=str)
    plot_group.add_argument("-C", "--cols", help="Max number of columns.", type=int)
    plot_group.add_argument("-e", "--extent", help="Map extent string of form: 'lonmin lonmax latmin latmax', or the string 'global' or 'ams'.", type=str)
    plot_group.add_argument("-L", "--levels", help="Level string used for plotting shaded contours. Each level separeted by blanks. Ex='-1 -.5 0 .5 1'",type=str)
    plot_group.add_argument("-v", "--var", help="Variable name in input NetCDF files", type=str)
    plot_group.add_argument("--use_cmap_in_plots", metavar = 'CMAP_STRING', nargs='+', help="Use alternative colormaps in specified plots {0,1,...}. %(metavar)s = 'CMAP:P1 P2 ...'. Ex: --use_cmap_in_plots='rainbow: 0 2 4'", type=str, action="extend")
    plot_group.add_argument("--use_levels_in_plots", metavar = 'LVL_STRING', nargs='+', help="Use alternative levels in specified plots {0,1,...}. %(metavar)s = 'LEVELS:P1 P2 ...'. Ex: --use_levels_in_plots='-100 -50 0 50 100:0 2 4'", type=str, action="extend")
    plot_group.add_argument("--multi_cbar", metavar = 'CBAR_PLOT', nargs='+', help="Display multiples colorbars from plot 0 to N. Ex displaying cbar from plot 1, then from plot 0 and from plot 3: --multi_cbar 1 0 3", type=int, action="extend")

    text_group.add_argument("-T", "--suptitle", help="Main title.", type=str)
    text_group.add_argument("-t", "--subtitles", nargs='+', help="Subtitle for each subplot.", type=str, action="extend")
    text_group.add_argument("-ct", "--col_titles", nargs='+', help="Column titles for the first row.", type=str, action="extend")
    text_group.add_argument("-rt", "--row_titles", nargs='+', help="Row titles in the middle of each row.", type=str, action="extend")
    text_group.add_argument("-l", "--labels", nargs='+', help="Label for each subplot.", type=str, action="extend")
    text_group.add_argument("--cbar_labels", nargs='+', help="Label for each cbar.", type=str, action="extend")
    text_group.add_argument("-f", "--title_fonts", nargs='+', help="Font family used in titles: FONTNAME or {'serif', 'sans-serif', 'cursive', 'fantasy', 'monospace'}.", type=str, action="extend")


    show_hidden_args = any('-h' in a for a in sys.argv)

    def add_hidden_argument(opt,*args, **kwargs):
        if not show_hidden_args:
            kwargs['help'] = argparse.SUPPRESS
        opt.add_argument(*args, **kwargs)

    add_hidden_argument(line_group, "--line_style"     , metavar = 'STYLE'  , help="Linestyle for Line Plot {dotted,dashed,solid,etc...}.", type=str)
    add_hidden_argument(line_group, "--line_color"     , metavar = 'COLOR'  , help="Line color for Line Plot." , type=str)
    add_hidden_argument(line_group, "--line_width"     , metavar = 'WIDTH'  , help="Line width for Line Plot." , type=float)
    add_hidden_argument(line_group, "--line_marker"    , metavar = 'MARKER' , help="Line marker for Line Plot.", type=str)
    add_hidden_argument(line_group, "--line_gridline"  , metavar = 'STYLE'  , help="Linestyle of gridline for Line Plot {dotted,dashed,solid,etc...}.", type=str)
    add_hidden_argument(line_group, "--line_tick_size" , metavar = ('XSIZE' , 'YSIZE' ), nargs=2, help="Text size of the ticks for Line Plot.", type=float)
    add_hidden_argument(line_group, "--line_numticks"  , metavar = ('XNUM'  , 'YNUM'  ), nargs=2, help="Number of ticks for Line Plot.", type=int)
    add_hidden_argument(line_group, "--line_labels"    , metavar = ('XLABEL', 'YLABEL'), nargs=2, help="Labels for Line Plot.", type=str)
    add_hidden_argument(line_group, "--line_label_size", metavar = ('XSIZE' , 'YSIZE' ), nargs=2, help="Label text size of Line Plot.", type=float)


    parser.add_argument("-q","--quiet", help="Supress options message.", action='store_true')
    parser.add_argument("--pickle", help=argparse.SUPPRESS, type=argparse.FileType('wb'))
    parser.add_argument("--unpickle", help=argparse.SUPPRESS, type=argparse.FileType('rb'))
    

    args, unknown = parser.parse_known_args()
    kwargs_parser = argparse.ArgumentParser(allow_abbrev=False)

    #https://stackoverflow.com/a/37367814
    for opt in unknown:
        if opt.startswith(("-", "--")):
            kwargs_parser.add_argument(opt.split("=")[0])

    kwargs,_ = kwargs_parser.parse_known_args()

    # flexing my pythonic swing
    args_dict = {k:v for k,v in (vars(kwargs) | vars(args)).items() if v is not None}

    #-# The above is the same (but not as cool) as:
    #-args_dict = {}
    #-for k,v in (vars(kwargs) | vars(args)).items():
    #-    if v is not None:
    #-        args_dict[k]=v



    #---------- Pickle Processing -----------
    class DictOnlyUnpickler(pickle.Unpickler):
        def load(self):
            obj = super().load()
            if not isinstance(obj, dict):
                raise TypeError("Only dict objects are allowed to be unpickled.")
            return obj

    # read arguments from file if specified
    if (unpickle_handler := args_dict.pop('unpickle',None)) is not None:
        unpickled_args = DictOnlyUnpickler(unpickle_handler).load()
        args_dict = unpickled_args | args_dict
    # save arguments to file if specified
    if (pickle_handler := args_dict.pop('pickle',None)) is not None:
        pickle.dump(args_dict, pickle_handler)
    #----------------------------------------



    # Validate that we have the number of input and significance files
    if not args_dict.get('input_files'):
        parser.error("At least one input file is required. use '--input_files' or '-i' to add.")

    print(args_dict)


    main(**args_dict)
